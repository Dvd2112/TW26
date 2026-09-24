<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/mailer.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

const RESET_RESEND_SECONDS = 120; // um novo código a cada 2 min
const RESET_TTL_MINUTES    = 15;

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    jsonResponse(400, false, 'JSON inválido.');
}

$email = filter_var(trim((string) ($data['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$cpf   = preg_replace('/\D/', '', (string) ($data['cpf'] ?? ''));

if ($email === false) {
    jsonResponse(422, false, 'E-mail inválido.');
}
if (!preg_match('/^\d{11}$/', $cpf)) {
    jsonResponse(422, false, 'CPF inválido.');
}

// Resposta idêntica exista a conta ou não (evita enumeração de usuários).
$genericMessage = 'Se os dados conferirem, enviaremos um código válido por ' . RESET_TTL_MINUTES . ' minutos.';

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        'SELECT id, name, email, reset_code_sent_at
         FROM users
         WHERE email = :email AND cpf = :cpf
         LIMIT 1'
    );
    $stmt->execute([':email' => $email, ':cpf' => $cpf]);
    $user = $stmt->fetch();

    if ($user === false) {
        appLog('password_reset.unknown_user', ['email' => $email]);
        jsonResponse(200, true, $genericMessage);
    }

    if ($user['reset_code_sent_at'] !== null) {
        $sentAt = new DateTimeImmutable($user['reset_code_sent_at']);
        if ($sentAt->getTimestamp() + RESET_RESEND_SECONDS > time()) {
            appLog('password_reset.throttled', ['user_id' => (int) $user['id']]);
            jsonResponse(200, true, $genericMessage);
        }
    }

    // 8 caracteres hex maiúsculos (32 bits). Só o hash vai para o banco.
    $code = strtoupper(bin2hex(random_bytes(4)));

    $update = $pdo->prepare(
        'UPDATE users
         SET reset_code_hash     = :hash,
             reset_code_expires  = NOW() + (:ttl * INTERVAL \'1 minute\'),
             reset_code_attempts = 0,
             reset_code_sent_at  = NOW(),
             updated_at          = NOW()
         WHERE id = :id'
    );
    $update->execute([
        ':hash' => hash('sha256', $code),
        ':ttl'  => RESET_TTL_MINUTES,
        ':id'   => $user['id'],
    ]);

    try {
        sendPasswordResetEmail($user['email'], $user['name'], $code);
    } catch (Throwable $mailError) {
        appLog('password_reset.mail_error', ['user_id' => (int) $user['id'], 'message' => $mailError->getMessage()]);
    }

    appLog('password_reset.requested', ['user_id' => (int) $user['id']]);
    jsonResponse(200, true, $genericMessage);
} catch (Exception $e) {
    appLog('password_reset.error', ['message' => $e->getMessage()]);
    jsonResponse(500, false, 'Erro interno. Tente novamente mais tarde.');
}
