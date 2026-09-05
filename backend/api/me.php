<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';

corsHeaders();
requireMethod('GET');

$user = currentUser();

if ($user === null) {
    jsonResponse(200, true, 'ok', ['user' => null]);
}

$perms = currentUserPermissions();

jsonResponse(200, true, 'ok', [
    'user'        => $user,
    'permissions' => $perms,
    'is_admin'    => count($perms) > 0,
]);