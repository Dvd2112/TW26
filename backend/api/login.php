<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    jsonResponse(400, false, 'JSON inválido.');
}

$email    = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$password = (string) ($data['password'] ?? '');

if ($email === false) {
    jsonResponse(422, false, 'E-mail inválido.');
}
if ($password === '') {
    jsonResponse(422, false, 'Informe a senha.');
}

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        'SELECT id, name, email, participant_type, password_hash
         FROM users WHERE email = :email LIMIT 1'
    );
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if ($user === false || !password_verify($password, $user['password_hash'])) {
        appLog('login.failed', ['email' => $email]);
        jsonResponse(401, false, 'E-mail ou senha incorretos.');
    }

    startSession();
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];

    appLog('login.success', ['user_id' => (int) $user['id'], 'email' => $user['email']]);

    jsonResponse(200, true, 'Login realizado.', [
        'user' => [
            'id'               => (int) $user['id'],
            'name'             => $user['name'],
            'email'            => $user['email'],
            'participant_type' => $user['participant_type'],
        ],
    ]);
} catch (Exception $e) {
    appLog('login.error', ['message' => $e->getMessage()]);
    jsonResponse(500, false, 'Erro interno no login.');
}