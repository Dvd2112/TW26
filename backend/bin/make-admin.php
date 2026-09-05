<?php
declare(strict_types=1);

/**
 * Cria/atualiza o admin inicial e concede a permissão super_admin.
 *
 * Uso: php backend/bin/make-admin.php
 * Requer ADMIN_EMAIL e ADMIN_PASSWORD no .env.
 */

require_once __DIR__ . '/../config/database.php';

$env      = _loadEnv();
$email    = $env['ADMIN_EMAIL']   ?? '';
$password = $env['ADMIN_PASSWORD'] ?? '';

if ($email === '' || $password === '') {
    fwrite(STDERR, "[TW26] Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env\n");
    exit(1);
}

if (strlen($password) < 8) {
    fwrite(STDERR, "[TW26] ADMIN_PASSWORD deve ter no mínimo 8 caracteres\n");
    exit(1);
}

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if ($user === false) {
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $pdo->prepare(
        'INSERT INTO users (name, cpf, email, institution, password_hash, participant_type)
         VALUES (:name, :cpf, :email, :institution, :password_hash, :participant_type)'
    )->execute([
        ':name'            => 'Administrador',
        ':cpf'             => '00000000000',
        ':email'           => $email,
        ':institution'     => 'organizacao',
        ':password_hash'   => $hash,
        ':participant_type' => 'staff',
    ]);
    $userId = (int) $pdo->lastInsertId();
    fwrite(STDOUT, "[TW26] Admin criado (id=$userId)\n");
} else {
    $userId = (int) $user['id'];
    $pdo->prepare('UPDATE users SET password_hash = :h WHERE id = :id')
        ->execute([':h' => password_hash($password, PASSWORD_BCRYPT), ':id' => $userId]);
    fwrite(STDOUT, "[TW26] Admin existente atualizado (id=$userId)\n");
}

$perm = $pdo->prepare("SELECT id FROM permissions WHERE slug = 'super_admin' LIMIT 1");
$perm->execute();
$permId = $perm->fetch();

if ($permId === false) {
    fwrite(STDERR, "[TW26] Permissão 'super_admin' não encontrada. Execute backend/database/seed.sql\n");
    exit(1);
}

$pdo->prepare(
    'INSERT INTO user_permissions (user_id, permission_id, granted_by)
     VALUES (:user_id, :permission_id, NULL)
     ON CONFLICT (user_id, permission_id) DO NOTHING'
)->execute([':user_id' => $userId, ':permission_id' => $permId['id']]);

fwrite(STDOUT, "[TW26] super_admin concedido a $email\n");