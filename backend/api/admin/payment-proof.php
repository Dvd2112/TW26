<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/storage.php';

corsHeaders();
requireMethod('GET');

requireAnyPermission(['super_admin', 'registration_admin']);

$paymentId = (int) ($_GET['payment_id'] ?? 0);
if ($paymentId <= 0) {
    jsonResponse(422, false, 'Pagamento inválido.');
}

$pdo  = getDbConnection();
$stmt = $pdo->prepare('SELECT proof_path FROM payments WHERE id = :id LIMIT 1');
$stmt->execute([':id' => $paymentId]);
$row = $stmt->fetch();

if ($row === false || $row['proof_path'] === null) {
    jsonResponse(404, false, 'Comprovante não encontrado.');
}

// proof_path é gerado pelo servidor no upload (nunca vem do usuário), então é
// seguro usá-lo direto no caminho do arquivo.
$path = storagePath('comprovantes/' . $row['proof_path']);
if (!is_file($path)) {
    jsonResponse(404, false, 'Arquivo do comprovante não encontrado.');
}

$mime = mime_content_type($path) ?: 'application/octet-stream';
header('Content-Type: ' . $mime);
header('Content-Disposition: inline; filename="comprovante-' . $paymentId . '"');
header('Content-Length: ' . (string) filesize($path));
readfile($path);
