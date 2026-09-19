<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

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
    $rem = (($sum * 10) % 11) % 10;
    if ($rem !== (int) $cpf[9]) {
        return false;
    }

    $sum = 0;
    for ($i = 0; $i < 10; $i++) {
        $sum += (int) $cpf[$i] * (11 - $i);
    }
    $rem = (($sum * 10) % 11) % 10;

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

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/mailer.php';

try {
    $pdo = getDbConnection();

    // Verificar duplicidade
    $check = $pdo->prepare(
        'SELECT id FROM users WHERE email = :email OR cpf = :cpf LIMIT 1'
    );
    $check->execute([':email' => $email, ':cpf' => $cpf]);

    if ($check->fetch() !== false) {
        appLog('register.duplicate', ['email' => $email]);
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'E-mail ou CPF já cadastrado.']);
        exit;
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (name, cpf, email, institution, password_hash)
         VALUES (:name, :cpf, :email, :institution, :password_hash)'
    );
    $insert->execute([
        ':name'          => $name,
        ':cpf'           => $cpf,
        ':email'         => $email,
        ':institution'   => $institution,
        ':password_hash' => $passwordHash,
    ]);
    $userId = (int) $pdo->lastInsertId();
} catch (Exception $e) {
    appLog('register.db_error', ['message' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar inscrição.']);
    exit;
}

appLog('register.success', ['user_id' => $userId, 'email' => $email, 'institution' => $institution]);

// E-mail de boas-vindas (não bloqueia o cadastro se o envio falhar)
try {
    sendWelcomeEmail($email, $name);
    appLog('register.welcome_email_sent', ['user_id' => $userId, 'email' => $email]);
} catch (Exception $e) {
    appLog('register.welcome_email_failed', ['user_id' => $userId, 'email' => $email, 'error' => $e->getMessage()]);
}

// Notificação ao admin
try {
    $maskedCpf = substr($cpf, 0, 3) . '.***.***-' . substr($cpf, 9, 2);
    sendAdminNotification($name, $maskedCpf, $email, $institution);
} catch (Exception $e) {
    appLog('register.admin_notification_failed', ['user_id' => $userId, 'error' => $e->getMessage()]);
}

// Auto-login: o participante segue autenticado para escolher o lote
startSession();
$_SESSION['user_id'] = $userId;
session_regenerate_id(true);

http_response_code(201);
echo json_encode([
    'success' => true,
    'message' => 'Cadastro criado! Finalizando sua inscrição...',
    'user_id' => $userId,
]);
