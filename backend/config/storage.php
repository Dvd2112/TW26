<?php
declare(strict_types=1);

if (!function_exists('storagePath')):
/**
 * Caminho absoluto para um arquivo dentro de storage/, na raiz do projeto —
 * FORA da pasta backend/ servida pelo router.php. Isso garante que arquivos
 * sensíveis (comprovantes de pagamento) só sejam acessíveis através de um
 * endpoint PHP autenticado, nunca por URL direta.
 */
function storagePath(string $relative): string
{
    $base = dirname(__DIR__, 2) . '/storage';
    $full = $base . '/' . ltrim($relative, '/');

    $dir = dirname($full);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $full;
}
endif;
