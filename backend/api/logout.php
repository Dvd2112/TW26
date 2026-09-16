<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

startSession();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $secure = env('SESSION_SECURE', '0') === '1';
    setcookie(
        session_name(),
        '',
        [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => $secure ? 'None' : 'Lax',
        ]
    );
}

session_destroy();

jsonResponse(200, true, 'Sessão encerrada.');