<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/storage.php';

corsHeaders();
requireMethod('GET');

$user = requireLogin();

function qrError(int $code, string $message): void
{
    header('Content-Type: application/json; charset=utf-8');
    jsonResponse($code, false, $message);
}

try {
    $pdo = getDbConnection();

    // Quem pode ver: admin de inscrições ou integrante (aceito) de uma equipe.
    $isAdmin = array_intersect(['super_admin', 'registration_admin'], currentUserPermissions()) !== [];
    if (!$isAdmin) {
        $stmt = $pdo->prepare("SELECT 1 FROM hackathon_members WHERE user_id = :uid AND invite_status = 'accepted' LIMIT 1");
        $stmt->execute([':uid' => $user['id']]);
        if ($stmt->fetchColumn() === false) {
            qrError(404, 'QR code não encontrado.');
        }
    }

    $qr = $pdo->query('SELECT qr_code_path FROM hackathon_settings WHERE id = 1')->fetchColumn();
    if ($qr === false || $qr === null) {
        qrError(404, 'QR code não encontrado.');
    }

    // qr_code_path é gerado pelo servidor no upload (nunca vem do usuário)
    $path = storagePath('qrcodes/' . $qr);
    if (!is_file($path)) {
        qrError(404, 'Arquivo do QR code não encontrado.');
    }

    header('Content-Type: ' . (mime_content_type($path) ?: 'application/octet-stream'));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-cache');
    header('Content-Length: ' . (string) filesize($path));
    readfile($path);
} catch (Exception $e) {
    error_log('[TW26] hackathon-qr.php: ' . $e->getMessage());
    qrError(500, 'Erro ao carregar o QR code.');
}
