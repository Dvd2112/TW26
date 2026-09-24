<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/storage.php';

corsHeaders();
requireMethod('GET');

requireAnyPermission(['super_admin', 'registration_admin']);

$memberId = (int) ($_GET['member_id'] ?? 0);
if ($memberId <= 0) {
    jsonResponse(422, false, 'Integrante inválido.');
}

$pdo  = getDbConnection();
$stmt = $pdo->prepare('SELECT proof_path FROM hackathon_members WHERE id = :id LIMIT 1');
$stmt->execute([':id' => $memberId]);
$row = $stmt->fetch();

if ($row === false || $row['proof_path'] === null) {
    jsonResponse(404, false, 'Comprovante não encontrado.');
}

// proof_path é gerado pelo servidor no upload (nunca vem do usuário).
$path = storagePath('comprovantes/' . $row['proof_path']);
if (!is_file($path)) {
    jsonResponse(404, false, 'Arquivo do comprovante não encontrado.');
}

header('Content-Type: ' . (mime_content_type($path) ?: 'application/octet-stream'));
header('Content-Disposition: inline; filename="comprovante-hackathon-' . $memberId . '"');
header('Content-Length: ' . (string) filesize($path));
readfile($path);
