<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/lotes.php';

corsHeaders();
requireMethod('POST');
requireCsrf();

$user = requireLogin();

$data = json_decode(file_get_contents('php://input') ?: '', true);
$requestedLoteId = is_array($data) ? (int) ($data['lote_id'] ?? 0) : 0;
if ($requestedLoteId <= 0) {
    jsonResponse(422, false, 'Selecione um lote para se inscrever.');
}

try {
    $pdo = getDbConnection();

    // Já possui inscrição ativa?
    $has = $pdo->prepare('SELECT id FROM registrations WHERE user_id = :uid LIMIT 1');
    $has->execute([':uid' => $user['id']]);
    if ($has->fetch() !== false) {
        jsonResponse(409, false, 'Você já possui uma inscrição para a TechWeek 2026.');
    }

    $pdo->beginTransaction();

    // O participante escolhe o lote, mas só pode escolher um lote do próprio
    // tipo (normal/voluntário/staff), aberto e da instituição dele (ou genérico,
    // institution IS NULL). Trava a linha (FOR UPDATE) para evitar estouro de
    // vagas em cadastros concorrentes.
    $loteStmt = $pdo->prepare(
        "SELECT id, name, price, capacity, volunteer_discount_percent, starts_at, ends_at,
                (qr_code_path IS NOT NULL) AS has_qr, pix_link
         FROM lotes
         WHERE id = :id
           AND is_active = true
           AND participant_type = :participant_type
           AND (institution = :institution OR institution IS NULL)
         FOR UPDATE"
    );
    $loteStmt->execute([
        ':id'               => $requestedLoteId,
        ':participant_type' => $user['participant_type'],
        ':institution'      => $user['institution'],
    ]);
    $lote = $loteStmt->fetch();

    if ($lote === false) {
        $pdo->rollBack();
        jsonResponse(422, false, 'Este lote não está disponível para o seu perfil e instituição.');
    }
    $loteId = (int) $lote['id'];

    // Janela de datas
    $now = new DateTimeImmutable('now');
    if ($lote['starts_at'] !== null && new DateTimeImmutable($lote['starts_at']) > $now) {
        $pdo->rollBack();
        jsonResponse(422, false, 'Este lote ainda não está aberto.');
    }
    if ($lote['ends_at'] !== null && new DateTimeImmutable($lote['ends_at']) < $now) {
        $pdo->rollBack();
        jsonResponse(422, false, 'Este lote já foi encerrado.');
    }

    // Capacidade
    $countStmt = $pdo->prepare(
        'SELECT count(*) FROM registrations WHERE lote_id = :id AND status <> \'cancelled\''
    );
    $countStmt->execute([':id' => $loteId]);
    $enrolled = (int) $countStmt->fetchColumn();

    if ($enrolled >= (int) $lote['capacity']) {
        $pdo->rollBack();
        jsonResponse(409, false, 'Lote esgotado.');
    }

    // Preço conforme o tipo de participante (staff = gratuito; voluntário = desconto)
    $type  = $user['participant_type'];
    $price = sprintf('%.2f', loteFinalPrice(
        (float) $lote['price'],
        (float) ($lote['volunteer_discount_percent'] ?? 0),
        $type
    ));

    $insReg = $pdo->prepare(
        'INSERT INTO registrations (user_id, lote_id, came_from_presave, status, payment_status, participant_type)
         VALUES (:uid, :lote, true, \'pending\', :payment_status, :type)'
    );
    $insReg->execute([
        ':uid'            => $user['id'],
        ':lote'           => $loteId,
        ':payment_status' => $price === '0.00' ? 'paid' : 'unpaid',
        ':type'           => $type,
    ]);
    $regId = (int) $pdo->lastInsertId();

    $insPay = $pdo->prepare(
        'INSERT INTO payments (registration_id, amount, status, paid_at)
         VALUES (:rid, :amount, :status, :paid_at)'
    );
    $insPay->execute([
        ':rid'     => $regId,
        ':amount'  => $price,
        ':status'  => $price === '0.00' ? 'paid' : 'pending',
        ':paid_at' => $price === '0.00' ? (new DateTimeImmutable('now'))->format('Y-m-d H:i:sP') : null,
    ]);
    $payId = (int) $pdo->lastInsertId();

    $pdo->commit();

    appLog('registrations.created', [
        'user_id'          => $user['id'],
        'registration_id'  => $regId,
        'lote_id'          => $loteId,
        'payment_status'   => $price === '0.00' ? 'paid' : 'pending',
    ]);

    jsonResponse(201, true, 'Inscrição realizada!', [
        'registration_id' => $regId,
        'payment_id'      => $payId,
        'lote_id'         => $loteId,
        'has_qr'          => dbBool($lote['has_qr']),
        'pix_link'        => $lote['pix_link'],
        'amount'          => $price,
        'payment_status'  => $price === '0.00' ? 'paid' : 'pending',
        'pix'             => [
            'key'  => env('PIX_KEY', ''),
            'name' => env('PIX_NAME', ''),
            'city' => env('PIX_CITY', ''),
        ],
    ]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    appLog('registrations.error', ['user_id' => $user['id'] ?? null, 'message' => $e->getMessage()]);
    jsonResponse(500, false, 'Erro interno ao processar a inscrição.');
}