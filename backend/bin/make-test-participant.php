<?php
declare(strict_types=1);

/**
 * Cria/atualiza um usuário PARTICIPANTE de teste, com inscrição e pagamento,
 * para testar a visão do inscrito (Minha Conta) localmente sem passar pelo
 * fluxo completo de cadastro.
 *
 * Uso: php backend/bin/make-test-participant.php [status]
 *   status: none | unpaid (padrão) | awaiting_confirmation | paid
 *
 *   none                   -> só cria o usuário, sem inscrição
 *   unpaid                 -> inscrição pendente, aguardando o PIX (testa o upload do comprovante)
 *   awaiting_confirmation  -> comprovante "enviado", aguardando aprovação do admin
 *   paid                   -> inscrição confirmada
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/lotes.php';

const TEST_EMAIL    = 'participante@teste.com';
const TEST_PASSWORD = 'Teste@1234';

$status = $argv[1] ?? 'unpaid';
$validStatuses = ['none', 'unpaid', 'awaiting_confirmation', 'paid'];
if (!in_array($status, $validStatuses, true)) {
    fwrite(STDERR, '[TW26] Status inválido. Use: ' . implode(', ', $validStatuses) . "\n");
    exit(1);
}

function printCredentials(): void
{
    fwrite(STDOUT, "\nLogin de teste:\n  E-mail: " . TEST_EMAIL . "\n  Senha:  " . TEST_PASSWORD . "\n");
}

$pdo = getDbConnection();

// ─── usuário ───────────────────────────────────────────────────────────────────
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => TEST_EMAIL]);
$user = $stmt->fetch();

$hash = password_hash(TEST_PASSWORD, PASSWORD_BCRYPT);

if ($user === false) {
    $pdo->prepare(
        'INSERT INTO users (name, cpf, email, institution, password_hash, participant_type, email_verified_at)
         VALUES (:name, :cpf, :email, :institution, :hash, :type, NOW())'
    )->execute([
        ':name'        => 'Participante Teste',
        ':cpf'         => '11111111111',
        ':email'       => TEST_EMAIL,
        ':institution' => 'UTFPR',
        ':hash'        => $hash,
        ':type'        => 'participant',
    ]);
    $userId = (int) $pdo->lastInsertId();
    fwrite(STDOUT, "[TW26] Usuário de teste criado (id=$userId)\n");
} else {
    $userId = (int) $user['id'];
    $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id')
        ->execute([':hash' => $hash, ':id' => $userId]);
    fwrite(STDOUT, "[TW26] Usuário de teste já existia, senha redefinida (id=$userId)\n");
}

if ($status === 'none') {
    fwrite(STDOUT, "[TW26] Nenhuma inscrição criada (status=none).\n");
    printCredentials();
    exit(0);
}

// ─── lote (usa um ativo existente, ou cria um de teste) ────────────────────────
$lote = $pdo->query('SELECT id, price FROM lotes WHERE is_active = true AND participant_type = \'participant\' ORDER BY order_index LIMIT 1')->fetch();

if ($lote === false) {
    $pdo->exec(
        "INSERT INTO lotes (name, price, capacity, order_index, is_active)
         VALUES ('Lote de Teste', 50.00, 100, 0, true)"
    );
    $loteId    = (int) $pdo->lastInsertId();
    $lotePrice = '50.00';
    fwrite(STDOUT, "[TW26] Lote de teste criado (id=$loteId)\n");
} else {
    $loteId    = (int) $lote['id'];
    $lotePrice = $lote['price'];
}

// ─── inscrição + pagamento ──────────────────────────────────────────────────────
// registrations.payment_status usa 'unpaid', mas payments.status usa 'pending' —
// os dois enums não batem, então mapeamos separadamente.
$regStatus     = $status === 'paid' ? 'confirmed' : 'pending';
$regPayStatus  = $status; // unpaid | awaiting_confirmation | paid
$paymentStatus = $status === 'unpaid' ? 'pending' : $status;
$paidAt        = $status === 'paid' ? (new DateTimeImmutable('now'))->format('Y-m-d H:i:sP') : null;

$existingReg = $pdo->prepare('SELECT id FROM registrations WHERE user_id = :uid LIMIT 1');
$existingReg->execute([':uid' => $userId]);
$reg = $existingReg->fetch();

if ($reg === false) {
    $pdo->prepare(
        'INSERT INTO registrations (user_id, lote_id, came_from_presave, status, payment_status, participant_type)
         VALUES (:uid, :lote, false, :status, :pay_status, :type)'
    )->execute([
        ':uid' => $userId, ':lote' => $loteId, ':status' => $regStatus,
        ':pay_status' => $regPayStatus, ':type' => 'participant',
    ]);
    $regId = (int) $pdo->lastInsertId();
} else {
    $regId = (int) $reg['id'];
    $pdo->prepare(
        'UPDATE registrations SET lote_id = :lote, status = :status, payment_status = :pay_status WHERE id = :id'
    )->execute([':lote' => $loteId, ':status' => $regStatus, ':pay_status' => $regPayStatus, ':id' => $regId]);
}

$existingPay = $pdo->prepare('SELECT id FROM payments WHERE registration_id = :rid LIMIT 1');
$existingPay->execute([':rid' => $regId]);
$pay = $existingPay->fetch();

if ($pay === false) {
    $pdo->prepare(
        'INSERT INTO payments (registration_id, amount, status, paid_at)
         VALUES (:rid, :amount, :status, :paid_at)'
    )->execute([':rid' => $regId, ':amount' => $lotePrice, ':status' => $paymentStatus, ':paid_at' => $paidAt]);
} else {
    $pdo->prepare(
        'UPDATE payments SET amount = :amount, status = :status, paid_at = :paid_at WHERE id = :id'
    )->execute([':amount' => $lotePrice, ':status' => $paymentStatus, ':paid_at' => $paidAt, ':id' => $pay['id']]);
}

if ($status === 'paid') {
    $pdo->beginTransaction();
    assignLoteIndex($pdo, $regId);
    $pdo->commit();
}

fwrite(STDOUT, "[TW26] Inscrição de teste pronta (status=$status)\n");
printCredentials();
