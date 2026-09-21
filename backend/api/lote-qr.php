<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/storage.php';

corsHeaders();
requireMethod('GET');

$user = requireLogin();

$loteId = (int) ($_GET['lote_id'] ?? 0);
if ($loteId <= 0) {
    header('Content-Type: application/json; charset=utf-8');
    jsonResponse(422, false, 'Lote inválido.');
}

try {
    $pdo  = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT qr_code_path, is_active, participant_type, institution FROM lotes WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $loteId]);
    $lote = $stmt->fetch();

    if ($lote === false || $lote['qr_code_path'] === null) {
        header('Content-Type: application/json; charset=utf-8');
        jsonResponse(404, false, 'QR code não encontrado.');
    }

    // Quem pode ver: admin de inscrições; quem está inscrito no lote; ou quem
    // poderia se inscrever nele (lote aberto, do seu tipo e da sua instituição).
    $isAdmin = array_intersect(['super_admin', 'registration_admin'], currentUserPermissions()) !== [];

    $isEnrolled = false;
    if (!$isAdmin) {
        $reg = $pdo->prepare('SELECT 1 FROM registrations WHERE user_id = :uid AND lote_id = :lid LIMIT 1');
        $reg->execute([':uid' => $user['id'], ':lid' => $loteId]);
        $isEnrolled = $reg->fetchColumn() !== false;
    }

    $canEnroll = dbBool($lote['is_active'])
        && $lote['participant_type'] === $user['participant_type']
        && ($lote['institution'] === null || $lote['institution'] === $user['institution']);

    if (!$isAdmin && !$isEnrolled && !$canEnroll) {
        header('Content-Type: application/json; charset=utf-8');
        jsonResponse(404, false, 'QR code não encontrado.');
    }

    // qr_code_path é gerado pelo servidor no upload (nunca vem do usuário)
    $path = storagePath('qrcodes/' . $lote['qr_code_path']);
    if (!is_file($path)) {
        header('Content-Type: application/json; charset=utf-8');
        jsonResponse(404, false, 'Arquivo do QR code não encontrado.');
    }

    header('Content-Type: ' . (mime_content_type($path) ?: 'application/octet-stream'));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-cache');
    header('Content-Length: ' . (string) filesize($path));
    readfile($path);
} catch (Exception $e) {
    error_log('[TW26] lote-qr.php: ' . $e->getMessage());
    header('Content-Type: application/json; charset=utf-8');
    jsonResponse(500, false, 'Erro ao carregar o QR code.');
}
