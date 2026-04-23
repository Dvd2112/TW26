<?php
declare(strict_types=1);

if (!function_exists('getDbConnection')):
function getDbConnection(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $env = _loadEnv();

    $dsn = sprintf(
        'pgsql:host=%s;port=%s;dbname=%s',
        $env['DB_HOST'],
        $env['DB_PORT'],
        $env['DB_NAME']
    );

    $pdo = new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);

    return $pdo;
}
endif;

if (!function_exists('getEnv')):
function getEnv(string $key, string $default = ''): string
{
    static $env = null;
    if ($env === null) {
        $env = _loadEnv();
    }
    return (string) ($env[$key] ?? $default);
}
endif;

if (!function_exists('_loadEnv')):
/**
 * @throws RuntimeException
 */
function _loadEnv(): array
{
    $envFile = __DIR__ . '/../.env';

    if (!file_exists($envFile)) {
        throw new RuntimeException(
            'Arquivo .env não encontrado.'
        );
    }

    $env = parse_ini_file($envFile);

    if ($env === false) {
        throw new RuntimeException('Falha ao ler o arquivo .env.');
    }

    foreach (['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $required) {
        if (empty($env[$required])) {
            throw new RuntimeException("Variável de ambiente obrigatória ausente no .env: $required");
        }
    }

    return $env;
}
endif;
