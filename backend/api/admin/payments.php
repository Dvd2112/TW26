<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mailer.php';
require_once __DIR__ . '/../../config/lotes.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'registration_admin']);

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: lista de inscrições + pagamentos ──────────────────────────────── */
if ($method === 'GET') {
    $status = trim($_GET['status'] ?? '');
    $loteId = (int) ($_GET['lote_id'] ?? 0);
    $tipo   = trim($_GET['participant_type'] ?? '');
    $index  = (int) ($_GET['lote_index'] ?? 0);

    $where  = [];
    $params = [];
    if ($status !== '') {
        $where[] = 'p.status = :status';
        $params[':status'] = $status;
    }
    if ($loteId > 0) {
        $where[] = 'r.lote_id = :lote';
        $params[':lote'] = $loteId;
    }
    if ($index > 0) {
        $where[] = 'r.lote_index = :idx';
        $params[':idx'] = $index;
    }
    if ($tipo !== '') {
        $where[] = 'r.participant_type = :tipo';
        $params[':tipo'] = $tipo;
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    try {
        $stmt = $pdo->prepare(
            "SELECT u.id AS user_id, u.name, u.email, u.participant_type AS user_type,
                    r.id AS registration_id, r.status AS reg_status, r.participant_type AS reg_type,
                    r.registered_at, r.lote_id, r.lote_index,
                    (" . loteOccupiesSlotSql('r') . ") AS holds_slot,
                    l.name AS lote_name, l.price AS lote_price,
                    p.id AS payment_id, p.amount, p.status AS payment_status,
                    p.participant_confirmed_at, p.paid_at, p.confirmed_note,
                    (p.proof_path IS NOT NULL) AS has_proof
             FROM registrations r
             JOIN users u ON u.id = r.user_id
             LEFT JOIN lotes l ON l.id = r.lote_id
             LEFT JOIN payments p ON p.registration_id = r.id
             $sqlWhere
             ORDER BY r.registered_at DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['amount']     = $row['amount'] !== null ? (float) $row['amount'] : null;
            $row['lote_price'] = $row['lote_price'] !== null ? (float) $row['lote_price'] : null;
            $row['user_id']    = (int) $row['user_id'];
            $row['lote_id']    = $row['lote_id'] !== null ? (int) $row['lote_id'] : null;
            $row['lote_index'] = $row['lote_index'] !== null ? (int) $row['lote_index'] : null;
            $row['registration_id'] = (int) $row['registration_id'];
            $row['payment_id'] = $row['payment_id'] !== null ? (int) $row['payment_id'] : null;
            $row['has_proof']  = dbBool($row['has_proof']);
            $row['holds_slot'] = dbBool($row['holds_slot']);
        }
        unset($row);

        jsonResponse(200, true, 'ok', ['registrations' => $rows]);
    } catch (Exception $e) {
        error_log('[TW26] admin/payments GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar inscrições.');
    }
}

/* ─── POST: confirmar / cancelar pagamento ───────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $action    = $data['action'] ?? '';
    $paymentId = (int) ($data['payment_id'] ?? 0);
    $note      = htmlspecialchars(strip_tags(trim((string) ($data['note'] ?? ''))), ENT_QUOTES, 'UTF-8');

    if (!in_array($action, ['confirm', 'cancel'], true) || $paymentId <= 0) {
        jsonResponse(422, false, 'Ação inválida.');
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT p.id, p.registration_id, p.status AS payment_status, p.amount,
                    r.status AS registration_status,
                    u.name AS user_name, u.email AS user_email,
                    l.name AS lote_name
             FROM payments p
             JOIN registrations r ON r.id = p.registration_id
             JOIN users u ON u.id = r.user_id
             LEFT JOIN lotes l ON l.id = r.lote_id
             WHERE p.id = :id'
        );
        $stmt->execute([':id' => $paymentId]);
        $pay = $stmt->fetch();

        if ($pay === false) {
            jsonResponse(404, false, 'Pagamento não encontrado.');
        }

        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:sP');

        if ($action === 'confirm') {
            // Aprovado == pago: inscrições gratuitas (staff) já nascem
            // confirmadas; aqui o admin aprova as pagas via PIX.
            if ($pay['registration_status'] === 'confirmed') {
                jsonResponse(409, false, 'Inscrição já confirmada.');
            }

            $pdo->beginTransaction();

            if ($pay['payment_status'] !== 'paid') {
                $pdo->prepare(
                    'UPDATE payments
                     SET status = \'paid\', paid_at = :now, confirmed_by = :by, confirmed_note = :note
                     WHERE id = :id'
                )->execute([':now' => $now, ':by' => $user['id'], ':note' => $note, ':id' => $paymentId]);
            }

            $pdo->prepare(
                'UPDATE registrations SET status = \'confirmed\', payment_status = \'paid\', confirmed_at = :now
                 WHERE id = :rid'
            )->execute([':now' => $now, ':rid' => $pay['registration_id']]);

            // Pagou: entra na numeração do lote (1, 2, 3...)
            $loteIndex = assignLoteIndex($pdo, (int) $pay['registration_id']);

            $pdo->commit();

            appLog('admin.registration_approved', [
                'admin_id'        => $user['id'],
                'registration_id' => $pay['registration_id'],
                'payment_id'      => $paymentId,
                'lote_index'      => $loteIndex,
            ]);

            try {
                sendPaymentConfirmedEmail(
                    $pay['user_email'],
                    $pay['user_name'],
                    $pay['lote_name'] ?? 'TechWeek 2026',
                    number_format((float) $pay['amount'], 2, ',', '.')
                );
            } catch (Exception $e) {
                appLog('admin.payment_confirmed_email_failed', [
                    'payment_id' => $paymentId,
                    'error'      => $e->getMessage(),
                ]);
            }

            jsonResponse(200, true, 'Inscrição aprovada e confirmada!');
        }

        // cancel
        $wasPaid = $pay['payment_status'] === 'paid';
        $pdo->prepare(
            'UPDATE payments
             SET status = :status, confirmed_by = :by, confirmed_note = :note
             WHERE id = :id'
        )->execute([
            ':status' => $wasPaid ? 'refunded' : 'failed',
            ':by'     => $user['id'],
            ':note'   => $note !== '' ? $note : 'Cancelado pelo admin',
            ':id'     => $paymentId,
        ]);
        $pdo->prepare(
            'UPDATE registrations SET status = \'cancelled\', payment_status = \'unpaid\' WHERE id = :rid'
        )->execute([':rid' => $pay['registration_id']]);

        appLog('admin.registration_cancelled', [
            'admin_id'        => $user['id'],
            'registration_id' => $pay['registration_id'],
            'payment_id'      => $paymentId,
            'was_paid'        => $wasPaid,
        ]);

        jsonResponse(200, true, 'Inscrição cancelada.');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TW26] admin/payments POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao atualizar pagamento.');
    }
}

jsonResponse(405, false, 'Método não permitido.');