<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/storage.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

$user = requireLogin();

// ─── comprovante (obrigatório) ─────────────────────────────────────────────────

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_PROOF_MIMES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'application/pdf' => 'pdf',
];

$file = $_FILES['comprovante'] ?? null;

if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    jsonResponse(422, false, 'Anexe o comprovante do PIX para confirmar o pagamento.');
}
if ($file['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(422, false, 'Falha no upload do comprovante. Tente novamente.');
}
if ($file['size'] <= 0 || $file['size'] > MAX_PROOF_BYTES) {
    jsonResponse(422, false, 'O comprovante deve ter no máximo 5MB.');
}

// Detecta o tipo real do arquivo (não confia na extensão nem no Content-Type do cliente)
$detectedMime = mime_content_type($file['tmp_name']) ?: '';
$extension    = ALLOWED_PROOF_MIMES[$detectedMime] ?? null;
if ($extension === null) {
    jsonResponse(422, false, 'Formato inválido. Envie uma imagem (JPG/PNG) ou PDF do comprovante.');
}

try {
    $pdo = getDbConnection();

    // Cada integrante paga a própria parte: comprovante vai na linha dele.
    $stmt = $pdo->prepare(
        "SELECT id, payment_status FROM hackathon_members
         WHERE user_id = :uid AND invite_status = 'accepted' LIMIT 1"
    );
    $stmt->execute([':uid' => $user['id']]);
    $member = $stmt->fetch();

    if ($member === false) {
        jsonResponse(404, false, 'Você não faz parte de uma equipe do hackathon.');
    }
    if ($member['payment_status'] === 'free') {
        jsonResponse(409, false, 'Você está isento do pagamento do hackathon.');
    }
    if ($member['payment_status'] === 'paid') {
        jsonResponse(409, false, 'Pagamento já confirmado.');
    }

    // Nome gerado pelo servidor — nunca deriva do nome/extensão enviados pelo cliente
    $filename    = sprintf('hackathon_%d_%s.%s', $member['id'], bin2hex(random_bytes(16)), $extension);
    $destination = storagePath('comprovantes/' . $filename);

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        appLog('hackathon.proof_upload_failed', ['user_id' => $user['id'], 'member_id' => $member['id']]);
        jsonResponse(500, false, 'Erro ao salvar o comprovante. Tente novamente.');
    }

    $pdo->prepare(
        "UPDATE hackathon_members
         SET payment_status = 'awaiting_confirmation', proof_path = :proof, proof_uploaded_at = NOW()
         WHERE id = :id"
    )->execute([':proof' => $filename, ':id' => $member['id']]);

    appLog('hackathon.proof_submitted', ['user_id' => $user['id'], 'member_id' => $member['id']]);

    jsonResponse(200, true, 'Comprovante enviado! A organização validará seu PIX em breve.');
} catch (Exception $e) {
    appLog('hackathon.payment_error', ['user_id' => $user['id'], 'message' => $e->getMessage()]);
    jsonResponse(500, false, 'Erro interno ao processar o pagamento.');
}
