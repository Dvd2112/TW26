<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/storage.php';

corsHeaders();
requireCsrf();

$pdo = getDbConnection();
requireAnyPermission(['super_admin', 'registration_admin']);

const MAX_QR_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_QR_MIMES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

/** Remove o arquivo de QR do disco (o nome vem do banco, gerado pelo servidor). */
function deleteQrFile(?string $filename): void
{
    if ($filename === null || $filename === '') {
        return;
    }
    $path = storagePath('qrcodes/' . $filename);
    if (is_file($path)) {
        unlink($path);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

/* ─── POST (multipart): enviar/substituir o QR do lote ──────────────────── */
if ($method === 'POST') {
    $id   = (int) ($_POST['id'] ?? 0);
    $file = $_FILES['qr'] ?? null;

    if ($id <= 0) {
        jsonResponse(422, false, 'Lote inválido.');
    }
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        jsonResponse(422, false, 'Anexe a imagem do QR code.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(422, false, 'Falha no upload da imagem. Tente novamente.');
    }
    if ($file['size'] <= 0 || $file['size'] > MAX_QR_BYTES) {
        jsonResponse(422, false, 'A imagem do QR code deve ter no máximo 2MB.');
    }

    // Detecta o tipo real do arquivo (não confia na extensão nem no Content-Type do cliente)
    $detectedMime = mime_content_type($file['tmp_name']) ?: '';
    $extension    = ALLOWED_QR_MIMES[$detectedMime] ?? null;
    if ($extension === null || @getimagesize($file['tmp_name']) === false) {
        jsonResponse(422, false, 'Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
    }

    try {
        $stmt = $pdo->prepare('SELECT qr_code_path FROM lotes WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $lote = $stmt->fetch();
        if ($lote === false) {
            jsonResponse(404, false, 'Lote não encontrado.');
        }

        // Nome gerado pelo servidor — nunca deriva do nome/extensão enviados pelo cliente
        $filename    = sprintf('lote_%d_%s.%s', $id, bin2hex(random_bytes(16)), $extension);
        $destination = storagePath('qrcodes/' . $filename);

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            appLog('lotes.qr_upload_failed', ['lote_id' => $id]);
            jsonResponse(500, false, 'Erro ao salvar a imagem. Tente novamente.');
        }

        $pdo->prepare('UPDATE lotes SET qr_code_path = :path WHERE id = :id')
            ->execute([':path' => $filename, ':id' => $id]);

        deleteQrFile($lote['qr_code_path']);

        jsonResponse(200, true, 'QR code salvo.');
    } catch (Exception $e) {
        error_log('[TW26] admin/lote-qr POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao salvar o QR code.');
    }
}

/* ─── DELETE: remover o QR do lote ───────────────────────────────────────── */
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    $id   = (int) ($data['id'] ?? 0);

    if ($id <= 0) {
        jsonResponse(422, false, 'Lote inválido.');
    }

    try {
        $stmt = $pdo->prepare('SELECT qr_code_path FROM lotes WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $lote = $stmt->fetch();
        if ($lote === false) {
            jsonResponse(404, false, 'Lote não encontrado.');
        }

        $pdo->prepare('UPDATE lotes SET qr_code_path = NULL WHERE id = :id')->execute([':id' => $id]);
        deleteQrFile($lote['qr_code_path']);

        jsonResponse(200, true, 'QR code removido.');
    } catch (Exception $e) {
        error_log('[TW26] admin/lote-qr DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao remover o QR code.');
    }
}

jsonResponse(405, false, 'Método não permitido.');
