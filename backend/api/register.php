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

// Limites de tamanho — previne payloads abusivos e truncamento silencioso no banco
$fieldLimits = [
    'name'        => [2,   120],
    'cpf'         => [11,   11],   // apenas dígitos após preg_replace
    'email'       => [5,   254],
    'institution' => [1,    80],
    'password'    => [8,   72],    // bcrypt trunca em 72 bytes
];
$fieldValues = [
    'name'        => $name,
    'cpf'         => $cpf,
    'email'       => $email !== false ? $email : '',
    'institution' => $institution,
    'password'    => $password,
];
foreach ($fieldLimits as $field => [$min, $max]) {
    $len = mb_strlen((string) $fieldValues[$field], 'UTF-8');
    if ($len < $min || $len > $max) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => "Tamanho inválido para o campo: $field"]);
        exit;
    }
}

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

// if (!validateCPF($cpf)) {
//     http_response_code(422);
//     echo json_encode(['success' => false, 'message' => 'CPF inválido.']);
//     exit;
// }

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

// Salvar no banco PostgreSQL
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/mailer.php';

// Gerar token de verificação de e-mail
$emailToken   = bin2hex(random_bytes(32)); // 64 chars hex
$tokenExpires = (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:sP');

try {
    $pdo = getDbConnection();

    // Verificar duplicidade
    $check = $pdo->prepare(
        'SELECT id FROM users WHERE email = :email OR cpf = :cpf LIMIT 1'
    );
    $check->execute([':email' => $email, ':cpf' => $cpf]);

    if ($check->fetch() !== false) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'E-mail ou CPF já cadastrado.']);
        exit;
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (name, cpf, email, institution, password_hash, email_token, email_token_expires)
         VALUES (:name, :cpf, :email, :institution, :password_hash, :email_token, :email_token_expires)'
    );
    $insert->execute([
        ':name'                => $name,
        ':cpf'                 => $cpf,
        ':email'               => $email,
        ':institution'         => $institution,
        ':password_hash'       => $passwordHash,
        ':email_token'         => $emailToken,
        ':email_token_expires' => $tokenExpires,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar inscrição.']);
    exit;
}

// E-mail de confirmação com link de verificação
try {
    sendConfirmationEmail($email, $name, $emailToken);
} catch (Exception $e) {
    // Não bloqueia o cadastro se o envio falhar; registra em log
    error_log('[TW26] Falha ao enviar e-mail de confirmação para ' . $email . ': ' . $e->getMessage());
}

// Notificação ao admin
try {
    $maskedCpf = substr($cpf, 0, 3) . '.***.***-' . substr($cpf, 9, 2);
    sendAdminNotification($name, $maskedCpf, $email, $institution);
} catch (Exception $e) {
    error_log('[TW26] Falha ao enviar notificação admin: ' . $e->getMessage());
}

http_response_code(201);
echo json_encode(['success' => true, 'message' => 'Pré-inscrição realizada! Verifique seu e-mail para confirmar o cadastro.']);
