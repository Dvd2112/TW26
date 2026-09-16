<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

if (!function_exists('corsHeaders')):
/**
 * Aplica CORS a partir da allowlist e trata OPTIONS.
 * Chamar ANTES de qualquer output.
 */
function corsHeaders(): void
{
    logRequest();

    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://techweek2026.com.br',
        'https://dvd2112.github.io',
    ];
    if (in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    csrfToken();
}
endif;

if (!function_exists('appLog')):
/**
 * Log estruturado da aplicação — vai para stderr, aparecendo junto do log
 * do servidor embutido do PHP no mesmo terminal.
 *
 * Remove automaticamente valores de chaves sensíveis do contexto (senha,
 * hash, token, cpf, etc.) para nunca vazar dado sensível no log.
 *
 * Uso: appLog('register.success', ['user_id' => $id, 'email' => $email]);
 */
function appLog(string $event, array $context = []): void
{
    static $sensitiveNeedles = [
        'password', 'senha', 'hash', 'token', 'cpf', 'csrf', 'authorization', 'secret',
    ];

    $safe = [];
    foreach ($context as $key => $value) {
        $lowerKey = strtolower((string) $key);
        $isSensitive = false;
        foreach ($sensitiveNeedles as $needle) {
            if (str_contains($lowerKey, $needle)) {
                $isSensitive = true;
                break;
            }
        }
        $safe[$key] = $isSensitive ? '[redacted]' : $value;
    }

    error_log(sprintf('[TW26] %s %s', $event, json_encode($safe, JSON_UNESCAPED_UNICODE)));
}
endif;

if (!function_exists('logRequest')):
/**
 * Loga método + rota de cada requisição recebida. Chamado automaticamente
 * por corsHeaders(), então todo endpoint que a usa já loga a requisição.
 */
function logRequest(): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? '?';
    $path   = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '?';
    appLog('request', ['method' => $method, 'path' => $path]);
}
endif;

if (!function_exists('csrfToken')):
/**
 * Garante que o cookie de CSRF (double-submit) exista e retorna seu valor.
 * O cookie NÃO é HttpOnly: o frontend precisa lê-lo para ecoar o valor no
 * header X-CSRF-Token em requisições que alteram estado.
 */
function csrfToken(): string
{
    $name  = 'tw26_csrf';
    $token = $_COOKIE[$name] ?? '';

    if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
        $token  = bin2hex(random_bytes(32));
        $secure = env('SESSION_SECURE', '0') === '1';
        setcookie($name, $token, [
            'expires'  => time() + 60 * 60 * 24 * 7,
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => false,
            'samesite' => $secure ? 'None' : 'Lax',
        ]);
        $_COOKIE[$name] = $token;
    }

    return $token;
}
endif;

if (!function_exists('requireCsrf')):
/**
 * Exige que o header X-CSRF-Token bata com o cookie tw26_csrf (double-submit).
 * Não afeta métodos seguros (GET/HEAD/OPTIONS).
 */
function requireCsrf(): void
{
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }

    $cookie = $_COOKIE['tw26_csrf'] ?? '';
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if ($cookie === '' || $header === '' || !hash_equals($cookie, $header)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Token CSRF inválido ou ausente.']);
        exit;
    }
}
endif;

if (!function_exists('requireMethod')):
/**
 * Garante o método HTTP esperado pelo endpoint (senão 405).
 */
function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
        exit;
    }
}
endif;

if (!function_exists('startSession')):
/**
 * Inicia sessão PHP com cookie HttpOnly, SameSite configurado.
 * SESSION_SECURE=1 (produção) -> cookie Secure + SameSite=None.
 */
function startSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = env('SESSION_SECURE', '0') === '1';
    session_name(env('SESSION_NAME', 'tw26_session'));
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => $secure ? 'None' : 'Lax',
    ]);
    session_start();
}
endif;

if (!function_exists('jsonResponse')):
/**
 * Resposta JSON padronizada (contrato { success, message }).
 */
function jsonResponse(int $code, bool $success, string $message, array $extra = []): void
{
    http_response_code($code);
    echo json_encode(
        array_merge(['success' => $success, 'message' => $message], $extra),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}
endif;