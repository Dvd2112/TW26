<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'registration_admin']);

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: lista de candidaturas + status do formulário ──────────────────── */
if ($method === 'GET') {
    $status = trim($_GET['status'] ?? '');
    $where  = [];
    $params = [];
    if ($status !== '') {
        $where[] = 'v.status = :status';
        $params[':status'] = $status;
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    try {
        $stmt = $pdo->prepare(
            "SELECT v.id, v.user_id, v.phone, v.roles, v.event_days, v.hackathon_days,
                    v.motivation, v.status, v.reviewed_at, v.created_at,
                    u.name, u.email, u.institution, u.participant_type
             FROM volunteer_applications v
             JOIN users u ON u.id = v.user_id
             $sqlWhere
             ORDER BY v.created_at DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['id']      = (int) $row['id'];
            $row['user_id'] = (int) $row['user_id'];
        }
        unset($row);

        $settings = $pdo->query('SELECT applications_open FROM volunteer_settings WHERE id = 1')->fetch();
        $open = $settings !== false ? dbBool($settings['applications_open']) : true;

        jsonResponse(200, true, 'ok', ['applications' => $rows, 'applications_open' => $open]);
    } catch (Exception $e) {
        error_log('[TW26] admin/volunteers GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar candidaturas.');
    }
}

/* ─── POST: aprovar / rejeitar candidatura / abrir-fechar formulário ─────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $action = $data['action'] ?? '';

    /* ─ abrir/fechar recebimento de candidaturas ─ */
    if ($action === 'set_open') {
        if (!is_bool($data['open'] ?? null)) {
            jsonResponse(422, false, 'Valor inválido.');
        }
        try {
            $pdo->prepare(
                'UPDATE volunteer_settings SET applications_open = :open, updated_at = NOW() WHERE id = 1'
            )->execute([':open' => $data['open']]);

            appLog('admin.volunteer_settings_updated', ['admin_id' => $user['id'], 'open' => $data['open']]);

            jsonResponse(200, true, $data['open'] ? 'Candidaturas reabertas.' : 'Candidaturas encerradas.');
        } catch (Exception $e) {
            error_log('[TW26] admin/volunteers POST (set_open): ' . $e->getMessage());
            jsonResponse(500, false, 'Erro interno ao atualizar configuração.');
        }
    }

    /* ─ aprovar/rejeitar candidatura ─ */
    $applicationId = (int) ($data['application_id'] ?? 0);

    if (!in_array($action, ['approve', 'reject'], true) || $applicationId <= 0) {
        jsonResponse(422, false, 'Ação inválida.');
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT id, user_id, status FROM volunteer_applications WHERE id = :id'
        );
        $stmt->execute([':id' => $applicationId]);
        $app = $stmt->fetch();

        if ($app === false) {
            jsonResponse(404, false, 'Candidatura não encontrada.');
        }

        if ($app['status'] !== 'pending') {
            jsonResponse(409, false, 'Candidatura já foi avaliada.');
        }

        $newStatus = $action === 'approve' ? 'approved' : 'rejected';

        $pdo->beginTransaction();

        $pdo->prepare(
            'UPDATE volunteer_applications
             SET status = :status, reviewed_by = :by, reviewed_at = NOW()
             WHERE id = :id'
        )->execute([':status' => $newStatus, ':by' => $user['id'], ':id' => $applicationId]);

        if ($action === 'approve') {
            $pdo->prepare(
                "UPDATE users SET participant_type = 'volunteer' WHERE id = :uid"
            )->execute([':uid' => $app['user_id']]);
        }

        $pdo->commit();

        appLog('admin.volunteer_' . $newStatus, [
            'admin_id'       => $user['id'],
            'application_id' => $applicationId,
            'user_id'        => $app['user_id'],
        ]);

        jsonResponse(200, true, $action === 'approve' ? 'Candidatura aprovada!' : 'Candidatura rejeitada.');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TW26] admin/volunteers POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao atualizar candidatura.');
    }
}

jsonResponse(405, false, 'Método não permitido.');
