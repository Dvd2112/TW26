<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/http.php';

if (!function_exists('currentUser')):
/**
 * Retorna o usuário da sessão ou null.
 *
 * @return array{id:int,name:string,email:string,participant_type:string,institution:?string}|null
 */
function currentUser(): ?array
{
    startSession();

    $id = $_SESSION['user_id'] ?? null;
    if ($id === null) {
        return null;
    }

    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT id, name, email, participant_type, institution FROM users WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();

    $cache = $user !== false ? $user : null;
    return $cache;
}
endif;

if (!function_exists('currentUserPermissions')):
/**
 * Lista de slugs de permissão do usuário da sessão.
 *
 * @return list<string>
 */
function currentUserPermissions(): array
{
    $user = currentUser();
    if ($user === null) {
        return [];
    }

    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT p.slug
         FROM permissions p
         JOIN user_permissions up ON up.permission_id = p.id
         WHERE up.user_id = :id'
    );
    $stmt->execute([':id' => $user['id']]);
    $cache = array_column($stmt->fetchAll(), 'slug');
    return $cache;
}
endif;

if (!function_exists('requireLogin')):
/**
 * Exige usuário autenticado (401 se não). Retorna o usuário.
 *
 * @return array{id:int,name:string,email:string,participant_type:string}
 */
function requireLogin(): array
{
    $user = currentUser();
    if ($user === null) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Não autenticado.']);
        exit;
    }
    return $user;
}
endif;

if (!function_exists('requireAnyPermission')):
/**
 * Exige autenticação + ao menos uma das permissões (403 se não).
 *
 * @param list<string> $slugs
 */
function requireAnyPermission(array $slugs): array
{
    $user  = requireLogin();
    $perms = currentUserPermissions();
    if (count(array_intersect($perms, $slugs)) === 0) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
        exit;
    }
    return $user;
}
endif;

if (!function_exists('requirePermission')):
/**
 * Exige autenticação + permissão específica (403 se não).
 *
 * @return array{id:int,name:string,email:string,participant_type:string}
 */
function requirePermission(string $slug): array
{
    $user  = requireLogin();
    $perms = currentUserPermissions();
    if (!in_array($slug, $perms, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
        exit;
    }
    return $user;
}
endif;