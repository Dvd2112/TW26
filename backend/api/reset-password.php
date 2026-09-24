<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

const RESET_MAX_ATTEMPTS = 5;

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    jsonResponse(400, false, 'JSON inválido.');
}

$email    = filter_var(trim((string) ($data['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$cpf      = preg_replace('/\D/', '', (string) ($data['cpf'] ?? ''));
$code     = strtoupper(trim((string) ($data['code'] ?? '')));
$password = (string) ($data['password'] ?? '');

if ($email === false) {
    jsonResponse(422, false, 'E-mail inválido.');
}
if (!preg_match('/^\d{11}$/', $cpf)) {
    jsonResponse(422, false, 'CPF inválido.');
}
if (!preg_match('/^[0-9A-F]{8}$/', $code)) {
    jsonResponse(422, false, 'Código inválido.');
}
if (strlen($password) < 8) {
    jsonResponse(422, false, 'A senha deve ter no mínimo 8 caracteres.');
}
if (strlen($password) > 72) { // bcrypt trunca em 72 bytes
    jsonResponse(422, false, 'A senha deve ter no máximo 72 caracteres.');
}

$invalidMessage = 'Código inválido ou expirado.';

try {
    $pdo = getDbConnection();
    $pdo->beginTransaction();

    // FOR UPDATE: serializa tentativas concorrentes no mesmo usuário (contador confiável).
    $stmt = $pdo->prepare(
        'SELECT id, reset_code_hash, reset_code_attempts,
                (reset_code_expires IS NOT NULL AND reset_code_expires > NOW()) AS still_valid
         FROM users
         WHERE email = :email AND cpf = :cpf
         LIMIT 1
         FOR UPDATE'
    );
    $stmt->execute([':email' => $email, ':cpf' => $cpf]);
    $user = $stmt->fetch();

    if (
        $user === false
        || $user['reset_code_hash'] === null
        || !$user['still_valid']
        || (int) $user['reset_code_attempts'] >= RESET_MAX_ATTEMPTS
    ) {
        $pdo->rollBack();
        appLog('password_reset.rejected', ['email' => $email]);
        jsonResponse(400, false, $invalidMessage);
    }

    if (!hash_equals($user['reset_code_hash'], hash('sha256', $code))) {
        $attempts = (int) $user['reset_code_attempts'] + 1;

        if ($attempts >= RESET_MAX_ATTEMPTS) {
            // esgotou as tentativas: invalida o código
            $fail = $pdo->prepare(
                'UPDATE users
                 SET reset_code_hash = NULL, reset_code_expires = NULL, reset_code_attempts = 0
                 WHERE id = :id'
            );
            $fail->execute([':id' => $user['id']]);
        } else {
            $fail = $pdo->prepare('UPDATE users SET reset_code_attempts = :n WHERE id = :id');
            $fail->execute([':n' => $attempts, ':id' => $user['id']]);
        }
        $pdo->commit();

        appLog('password_reset.wrong_code', ['user_id' => (int) $user['id'], 'attempts' => $attempts]);
        jsonResponse(400, false, $invalidMessage);
    }

    $update = $pdo->prepare(
        'UPDATE users
         SET password_hash       = :password_hash,
             reset_code_hash     = NULL,
             reset_code_expires  = NULL,
             reset_code_attempts = 0,
             reset_code_sent_at  = NULL,
             updated_at          = NOW()
         WHERE id = :id'
    );
    $update->execute([
        ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
        ':id'            => $user['id'],
    ]);
    $pdo->commit();

    appLog('password_reset.success', ['user_id' => (int) $user['id']]);
    jsonResponse(200, true, 'Senha alterada com sucesso.');
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    appLog('password_reset.error', ['message' => $e->getMessage()]);
    jsonResponse(500, false, 'Erro interno. Tente novamente mais tarde.');
}
