<?php
declare(strict_types=1);

/**
 * Router do servidor de desenvolvimento da TechWeek 2026.
 *
 * Uso (da raiz do repositório):
 *   php -S localhost:8080 backend/router.php
 *
 * Mapeia /TW26/backend/<arquivo> para backend/<arquivo>, permitindo que o
 * frontend em dev (proxy do CRA em /TW26/...) consuma a API sem CORS e
 * sem expor o caminho real. Bloqueia dotfiles (.env, .env.example, ...) e a
 * pasta storage/ (comprovantes e QR codes: só via endpoints PHP autenticados).
 */

$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$root = __DIR__;

// Decodifica antes de checar: o servidor embutido também decodifica (%2e, %73...)
// ao resolver arquivos estáticos, então checar só o texto cru deixaria brecha.
$decoded = rawurldecode($uri);

// Bloqueia dotfiles (arquivos sensíveis)
if (preg_match('#(^|/)\.#', $decoded)) {
    http_response_code(404);
    exit;
}

// Bloqueia storage/ — sem isto, o `return false` no fim deste arquivo deixaria o
// servidor embutido (docroot = raiz do repo) entregar os arquivos por URL direta.
if (preg_match('#(^|/)storage(/|$)#i', $decoded)) {
    http_response_code(404);
    exit;
}

if (str_starts_with($uri, '/TW26/backend/')) {
    $relative = ltrim(substr($uri, strlen('/TW26/backend/')), '/');
    if ($relative === '') {
        http_response_code(404);
        exit;
    }

    $file = $root . '/' . $relative;
    $real = realpath($file);

    // Previne traversal fora de backend/
    if ($real === false || !str_starts_with($real, $root . DIRECTORY_SEPARATOR)) {
        http_response_code(404);
        exit;
    }

    if (is_file($real)) {
        $ext = strtolower(pathinfo($real, PATHINFO_EXTENSION));
        if ($ext === 'php') {
            require $real;
            return true;
        }

        $mime = [
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'svg'  => 'image/svg+xml',
            'json' => 'application/json',
        ][$ext] ?? 'application/octet-stream';

        header("Content-Type: $mime");
        readfile($real);
        return true;
    }

    http_response_code(404);
    exit;
}

// Demais caminhos: deixa o servidor embutido resolver (docroot = backend/)
return false;