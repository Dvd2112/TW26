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

// Detecta o tipo real do arquivo (não confia na extensão nem no Content-Type enviado pelo cliente)
$detectedMime = mime_content_type($file['tmp_name']) ?: '';
$extension    = ALLOWED_PROOF_MIMES[$detectedMime] ?? null;

if ($extension === null) {
    jsonResponse(422, false, 'Formato inválido. Envie uma imagem (JPG/PNG) ou PDF do comprovante.');
}

try {
    $pdo = getDbConnection();

    // Pagamento da inscrição do usuário logado
    $stmt = $pdo->prepare(
        'SELECT p.id, p.status, r.payment_status
         FROM payments p
         JOIN registrations r ON r.id = p.registration_id
         WHERE r.user_id = :uid
         ORDER BY p.id DESC
         LIMIT 1'
    );
    $stmt->execute([':uid' => $user['id']]);
    $pay = $stmt->fetch();

    if ($pay === false) {
        jsonResponse(404, false, 'Nenhum pagamento pendente encontrado.');
    }
    if ($pay['status'] === 'paid') {
        jsonResponse(409, false, 'Pagamento já confirmado.');
    }

    // Nome gerado pelo servidor — nunca deriva do nome/extensão enviados pelo cliente
    $filename = sprintf('payment_%d_%s.%s', $pay['id'], bin2hex(random_bytes(16)), $extension);
    $destination = storagePath('comprovantes/' . $filename);

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        appLog('payments.proof_upload_failed', ['user_id' => $user['id'], 'payment_id' => $pay['id']]);
        jsonResponse(500, false, 'Erro ao salvar o comprovante. Tente novamente.');
    }

    $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:sP');

    $pdo->prepare(
        'UPDATE payments
         SET status = \'awaiting_confirmation\', participant_confirmed_at = :now,
             proof_path = :proof, proof_uploaded_at = :now
         WHERE id = :id'
    )->execute([':now' => $now, ':proof' => $filename, ':id' => $pay['id']]);

    $pdo->prepare(
        'UPDATE registrations SET payment_status = \'awaiting_confirmation\' WHERE user_id = :uid'
    )->execute([':uid' => $user['id']]);

    appLog('payments.proof_submitted', ['user_id' => $user['id'], 'payment_id' => $pay['id']]);

    jsonResponse(200, true, 'Comprovante enviado! A organização validará seu PIX em breve.');
} catch (Exception $e) {
    appLog('payments.error', ['user_id' => $user['id'], 'message' => $e->getMessage()]);
    jsonResponse(500, false, 'Erro interno ao processar o pagamento.');
}
