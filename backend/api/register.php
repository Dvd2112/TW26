<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// CORS — ajuste o domínio em produção
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost:5173',
    'https://techweek2026.com.br',
    'https://dvd2112.github.io',
];
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
    exit;
}

// Campos obrigatórios
$required = ['name', 'cpf', 'email', 'institution', 'password'];
foreach ($required as $field) {
    if (empty(trim($data[$field] ?? ''))) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => "Campo obrigatório ausente: $field"]);
        exit;
    }
}

$name        = htmlspecialchars(strip_tags(trim($data['name'])), ENT_QUOTES, 'UTF-8');
$cpf         = preg_replace('/\D/', '', trim($data['cpf']));
$email       = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
$institution = htmlspecialchars(strip_tags(trim($data['institution'])), ENT_QUOTES, 'UTF-8');
$password    = $data['password'];

// Validar e-mail
if ($email === false) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'E-mail inválido.']);
    exit;
}

// Validar CPF
function validateCPF(string $cpf): bool
{
    if (strlen($cpf) !== 11) {
        return false;
    }
    if (preg_match('/^(\d)\1+$/', $cpf)) {
        return false;
    }

    $sum = 0;
    for ($i = 0; $i < 9; $i++) {
        $sum += (int) $cpf[$i] * (10 - $i);
    }
    $rem = (11 - ($sum % 11)) % 11;
    if ($rem !== (int) $cpf[9]) {
        return false;
    }

    $sum = 0;
    for ($i = 0; $i < 10; $i++) {
        $sum += (int) $cpf[$i] * (11 - $i);
    }
    $rem = (11 - ($sum % 11)) % 11;

    return $rem === (int) $cpf[10];
}

if (!validateCPF($cpf)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'CPF inválido.']);
    exit;
}

// Validar instituição
$allowedInstitutions = ['UTFPR', 'CESUL', 'UNIPAR', 'outros'];
if (!in_array($institution, $allowedInstitutions, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Instituição inválida.']);
    exit;
}

// Validar senha
if (strlen($password) < 8) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'A senha deve ter no mínimo 8 caracteres.']);
    exit;
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

// Salvar no banco SQLite
$dbDir  = __DIR__ . '/../data';
$dbPath = $dbDir . '/registrations.db';

if (!is_dir($dbDir)) {
    mkdir($dbDir, 0750, true);
}

try {
    $db = new SQLite3($dbPath, SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);
    $db->exec('PRAGMA journal_mode=WAL;');
    $db->exec(
        'CREATE TABLE IF NOT EXISTS registrations (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            cpf           TEXT    NOT NULL UNIQUE,
            email         TEXT    NOT NULL UNIQUE,
            institution   TEXT    NOT NULL,
            password_hash TEXT    NOT NULL,
            created_at    TEXT    NOT NULL DEFAULT (datetime("now"))
        )'
    );

    // Verificar duplicidade
    $stmt   = $db->prepare('SELECT id FROM registrations WHERE email = :email OR cpf = :cpf LIMIT 1');
    $stmt->bindValue(':email', $email, SQLITE3_TEXT);
    $stmt->bindValue(':cpf',   $cpf,   SQLITE3_TEXT);
    $result   = $stmt->execute();
    $existing = $result->fetchArray(SQLITE3_ASSOC);

    if ($existing !== false) {
        $db->close();
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'E-mail ou CPF já cadastrado.']);
        exit;
    }

    $insert = $db->prepare(
        'INSERT INTO registrations (name, cpf, email, institution, password_hash)
         VALUES (:name, :cpf, :email, :institution, :password_hash)'
    );
    $insert->bindValue(':name',          $name,         SQLITE3_TEXT);
    $insert->bindValue(':cpf',           $cpf,          SQLITE3_TEXT);
    $insert->bindValue(':email',         $email,        SQLITE3_TEXT);
    $insert->bindValue(':institution',   $institution,  SQLITE3_TEXT);
    $insert->bindValue(':password_hash', $passwordHash, SQLITE3_TEXT);
    $insert->execute();
    $db->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar inscrição.']);
    exit;
}

// E-mail de confirmação ao participante
$headers  = "From: noreply@techweek2026.com.br\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$confirmSubject = "=?UTF-8?B?" . base64_encode("[TechWeek 2026] Pré-inscrição confirmada — $name") . "?=";
$confirmBody    = "Olá, $name!\n\n";
$confirmBody   .= "Sua pré-inscrição na TechWeek 2026 foi realizada com sucesso.\n\n";
$confirmBody   .= "Dados registrados:\n";
$confirmBody   .= "Nome:        $name\n";
$confirmBody   .= "E-mail:      $email\n";
$confirmBody   .= "Instituição: $institution\n\n";
$confirmBody   .= "Em breve você receberá mais informações sobre datas, programação e confirmação da sua inscrição.\n\n";
$confirmBody   .= "Equipe TechWeek 2026\n";
mail($email, $confirmSubject, $confirmBody, $headers);

// Notificação ao admin (CPF parcialmente mascarado)
$maskedCpf    = substr($cpf, 0, 3) . '.***.***-' . substr($cpf, 9, 2);
$adminSubject = "=?UTF-8?B?" . base64_encode("[TechWeek 2026] Nova pré-inscrição — $name") . "?=";
$adminBody    = "Nova pré-inscrição recebida:\n\n";
$adminBody   .= "Nome:        $name\n";
$adminBody   .= "CPF:         $maskedCpf\n";
$adminBody   .= "E-mail:      $email\n";
$adminBody   .= "Instituição: $institution\n";
mail('david.junior211204@gmail.com', $adminSubject, $adminBody, $headers);

http_response_code(201);
echo json_encode(['success' => true, 'message' => 'Pré-inscrição realizada com sucesso!']);
