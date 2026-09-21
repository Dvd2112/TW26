<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requirePermission('super_admin');

$method = $_SERVER['REQUEST_METHOD'];

function cleanUserText(mixed $value): string
{
    return htmlspecialchars(strip_tags(trim((string) $value)), ENT_QUOTES, 'UTF-8');
}

function listPermissionsForUsers(PDO $pdo, array $users): array
{
    $byUser = [];
    foreach ($users as $u) {
        $byUser[(int) $u['id']] = [];
    }
    if ($users) {
        $ids = array_keys($byUser);
        $in  = implode(',', array_map('intval', $ids));
        $stmt = $pdo->query(
            "SELECT up.user_id, p.slug
             FROM user_permissions up
             JOIN permissions p ON p.id = up.permission_id
             WHERE up.user_id IN ($in)"
        );
        foreach ($stmt->fetchAll() as $row) {
            $byUser[(int) $row['user_id']][] = $row['slug'];
        }
    }
    return $byUser;
}

/* ─── GET: lista de usuários + permissões disponíveis ────────────────────── */
if ($method === 'GET') {
    try {
        $users = $pdo->query(
            'SELECT u.id, u.name, u.email, u.cpf, u.institution, u.participant_type, u.created_at,
                    r.status AS reg_status, r.lote_id, r.lote_index, l.name AS lote_name
             FROM users u
             LEFT JOIN registrations r ON r.user_id = u.id
             LEFT JOIN lotes l ON l.id = r.lote_id
             ORDER BY u.created_at DESC'
        )->fetchAll();

        $permsByUser = listPermissionsForUsers($pdo, $users);
        foreach ($users as &$u) {
            $u['id']        = (int) $u['id'];
            $u['lote_id']    = $u['lote_id'] !== null ? (int) $u['lote_id'] : null;
            $u['lote_index'] = $u['lote_index'] !== null ? (int) $u['lote_index'] : null;
            $u['permissions'] = $permsByUser[(int) $u['id']] ?? [];
        }
        unset($u);

        $available = $pdo->query('SELECT slug, name FROM permissions ORDER BY slug')->fetchAll();

        jsonResponse(200, true, 'ok', [
            'users'      => $users,
            'permissions' => $available,
        ]);
    } catch (Exception $e) {
        error_log('[TW26] admin/users GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar usuários.');
    }
}

/* ─── POST: criar usuário ────────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $name     = cleanUserText($data['name'] ?? '');
    $email    = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $cpf      = preg_replace('/\D/', '', (string) ($data['cpf'] ?? ''));
    $instit   = cleanUserText($data['institution'] ?? '');
    $password = (string) ($data['password'] ?? '');
    $type     = cleanUserText($data['participant_type'] ?? 'participant');
    $perms    = $data['permissions'] ?? [];

    if ($name === '' || $email === false || strlen($cpf) !== 11 || strlen($password) < 8) {
        jsonResponse(422, false, 'Preencha nome, e-mail, CPF válido e senha (mín. 8).');
    }
    if (!in_array($type, ['participant', 'volunteer', 'staff'], true)) {
        jsonResponse(422, false, 'Tipo de participante inválido.');
    }

    try {
        $dup = $pdo->prepare('SELECT id FROM users WHERE email = :email OR cpf = :cpf LIMIT 1');
        $dup->execute([':email' => $email, ':cpf' => $cpf]);
        if ($dup->fetch() !== false) {
            jsonResponse(409, false, 'E-mail ou CPF já cadastrado.');
        }

        $pdo->prepare(
            'INSERT INTO users (name, cpf, email, institution, password_hash, participant_type)
             VALUES (:name, :cpf, :email, :institution, :hash, :type)'
        )->execute([
            ':name'  => $name,
            ':cpf'   => $cpf,
            ':email' => $email,
            ':institution' => $instit,
            ':hash'  => password_hash($password, PASSWORD_BCRYPT),
            ':type'  => $type,
        ]);
        $userId = (int) $pdo->lastInsertId();

        $assign = $pdo->prepare(
            'INSERT INTO user_permissions (user_id, permission_id, granted_by)
             SELECT :uid, id, :by FROM permissions WHERE slug = :slug'
        );
        foreach ($perms as $slug) {
            $assign->execute([':uid' => $userId, ':by' => $user['id'], ':slug' => $slug]);
        }

        jsonResponse(201, true, 'Usuário criado.');
    } catch (Exception $e) {
        error_log('[TW26] admin/users POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao criar usuário.');
    }
}

/* ─── PUT: atualizar ─────────────────────────────────────────────────────── */
if ($method === 'PUT') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $id = (int) ($data['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(422, false, 'Usuário inválido.');
    }

    $name   = cleanUserText($data['name'] ?? '');
    $email  = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $cpf    = preg_replace('/\D/', '', (string) ($data['cpf'] ?? ''));
    $instit = cleanUserText($data['institution'] ?? '');
    $type   = cleanUserText($data['participant_type'] ?? 'participant');
    $password = (string) ($data['password'] ?? '');
    $perms  = $data['permissions'] ?? null;

    if ($name === '' || $email === false || strlen($cpf) !== 11) {
        jsonResponse(422, false, 'Dados inválidos.');
    }
    if (!in_array($type, ['participant', 'volunteer', 'staff'], true)) {
        jsonResponse(422, false, 'Tipo de participante inválido.');
    }
    if ($password !== '' && strlen($password) < 8) {
        jsonResponse(422, false, 'Senha deve ter no mínimo 8 caracteres.');
    }

    try {
        $pdo->prepare(
            'UPDATE users SET name = :name, email = :email, cpf = :cpf,
                institution = :institution, participant_type = :type, updated_at = NOW()
             WHERE id = :id'
        )->execute([
            ':name' => $name, ':email' => $email, ':cpf' => $cpf,
            ':institution' => $instit, ':type' => $type, ':id' => $id,
        ]);

        if ($password !== '') {
            $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id')
                ->execute([':hash' => password_hash($password, PASSWORD_BCRYPT), ':id' => $id]);
        }

        if ($perms !== null) {
            $pdo->prepare('DELETE FROM user_permissions WHERE user_id = :id')->execute([':id' => $id]);
            $assign = $pdo->prepare(
                'INSERT INTO user_permissions (user_id, permission_id, granted_by)
                 SELECT :uid, id, :by FROM permissions WHERE slug = :slug'
            );
            foreach ($perms as $slug) {
                $assign->execute([':uid' => $id, ':by' => $user['id'], ':slug' => $slug]);
            }
        }

        jsonResponse(200, true, 'Usuário atualizado.');
    } catch (Exception $e) {
        error_log('[TW26] admin/users PUT: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao atualizar usuário.');
    }
}

/* ─── DELETE ─────────────────────────────────────────────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    $id   = (int) ($data['id'] ?? ($_GET['id'] ?? 0));

    if ($id <= 0) {
        jsonResponse(422, false, 'Usuário inválido.');
    }
    if ($id === $user['id']) {
        jsonResponse(409, false, 'Você não pode remover o próprio usuário.');
    }

    try {
        $pdo->prepare('DELETE FROM users WHERE id = :id')->execute([':id' => $id]);
        jsonResponse(200, true, 'Usuário removido.');
    } catch (Exception $e) {
        error_log('[TW26] admin/users DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao remover usuário.');
    }
}

jsonResponse(405, false, 'Método não permitido.');