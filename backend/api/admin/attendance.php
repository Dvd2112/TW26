<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/attendance.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'credentialer']);

// null = super_admin (sem restrição); lista = atividades designadas ao credenciador.
$scope = credentialerActivityIds($pdo, (int) $user['id'], currentUserPermissions());

$method = $_SERVER['REQUEST_METHOD'];

/**
 * Bloqueia atividade fora do escopo do credenciador. Também barra id inválido.
 */
function requireActivityInScope(?array $scope, int $activityId): void
{
    if ($activityId <= 0) {
        jsonResponse(422, false, 'Atividade inválida.');
    }
    if (!canCredentialActivity($scope, $activityId)) {
        jsonResponse(403, false, 'Você não está designado para credenciar esta atividade.');
    }
}

/* ─── GET: atividades no escopo | presentes de uma atividade ──────────────── */
if ($method === 'GET') {
    try {
        // Lista de presentes de uma atividade específica
        if (isset($_GET['activity_id'])) {
            $activityId = (int) $_GET['activity_id'];
            requireActivityInScope($scope, $activityId);

            $stmt = $pdo->prepare(
                'SELECT u.id AS user_id, u.name, u.email,
                        at.method, at.checked_in_at,
                        b.name AS checked_in_by_name
                 FROM activity_attendance at
                 JOIN users u ON u.id = at.user_id
                 LEFT JOIN users b ON b.id = at.checked_in_by
                 WHERE at.activity_id = :aid
                 ORDER BY at.checked_in_at DESC'
            );
            $stmt->execute([':aid' => $activityId]);

            $rows = $stmt->fetchAll();
            foreach ($rows as &$row) {
                $row['user_id'] = (int) $row['user_id'];
            }
            unset($row);

            jsonResponse(200, true, 'ok', ['attendance' => $rows]);
        }

        // Só as atividades que este usuário pode credenciar
        if ($scope !== null && $scope === []) {
            jsonResponse(200, true, 'ok', ['activities' => [], 'scoped' => true]);
        }

        $where  = 'WHERE TRUE';
        $params = [];
        if ($scope !== null) {
            // Ids já convertidos para int por credentialerActivityIds()
            $where = 'WHERE a.id IN (' . implode(',', $scope) . ')';
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.title, a.type, a.location, a.start_at, a.end_at,
                    a.capacity, a.attendance_code,
                    (SELECT count(*) FROM activity_enrollments e WHERE e.activity_id = a.id) AS enrolled,
                    (SELECT count(*) FROM activity_attendance at WHERE at.activity_id = a.id) AS attended
             FROM activities a
             $where
             ORDER BY a.start_at ASC NULLS LAST, a.id ASC"
        );
        $stmt->execute($params);

        $activities = $stmt->fetchAll();
        foreach ($activities as &$activity) {
            $activity['id']       = (int) $activity['id'];
            $activity['enrolled'] = (int) $activity['enrolled'];
            $activity['attended'] = (int) $activity['attended'];
            $activity['capacity'] = $activity['capacity'] !== null ? (int) $activity['capacity'] : null;
        }
        unset($activity);

        jsonResponse(200, true, 'ok', [
            'activities' => $activities,
            'scoped'     => $scope !== null,
        ]);
    } catch (Exception $e) {
        error_log('[TW26] admin/attendance GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar o credenciamento.');
    }
}

/* ─── POST: registrar presença pelo código do participante ───────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $activityId = (int) ($data['activity_id'] ?? 0);
    requireActivityInScope($scope, $activityId);

    $code = normalizeAttendanceCode($data['code'] ?? '');
    if ($code === '') {
        jsonResponse(422, false, 'Informe o código do participante.');
    }

    // Só 'scan' e 'manual' vêm do credenciador; 'self' é exclusivo do participante.
    $checkinMethod = in_array($data['method'] ?? '', ['scan', 'manual'], true)
        ? $data['method']
        : 'manual';

    try {
        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.email, r.payment_status
             FROM users u
             LEFT JOIN registrations r ON r.user_id = u.id
             WHERE u.checkin_code = :code
             LIMIT 1'
        );
        $stmt->execute([':code' => $code]);
        $participant = $stmt->fetch();

        if ($participant === false) {
            jsonResponse(404, false, 'Código não encontrado.');
        }
        $participantId = (int) $participant['id'];

        $enrolled = $pdo->prepare(
            'SELECT 1 FROM activity_enrollments WHERE user_id = :uid AND activity_id = :aid'
        );
        $enrolled->execute([':uid' => $participantId, ':aid' => $activityId]);
        if ($enrolled->fetch() === false) {
            jsonResponse(422, false, $participant['name'] . ' não está inscrito nesta atividade.');
        }

        $inserted = recordAttendance(
            $pdo,
            $participantId,
            $activityId,
            $checkinMethod,
            (int) $user['id']
        );

        $payload = [
            'user' => [
                'id'             => $participantId,
                'name'           => $participant['name'],
                'payment_status' => $participant['payment_status'],
            ],
        ];

        if (!$inserted) {
            // Já tinha presença: devolve quando foi, para a UI avisar em vez de fingir sucesso.
            $prev = $pdo->prepare(
                'SELECT checked_in_at FROM activity_attendance
                 WHERE user_id = :uid AND activity_id = :aid'
            );
            $prev->execute([':uid' => $participantId, ':aid' => $activityId]);
            $payload['checked_in_at'] = $prev->fetchColumn() ?: null;

            jsonResponse(409, false, $participant['name'] . ' já teve a presença registrada.', $payload);
        }

        appLog('attendance.checkin', [
            'activity_id' => $activityId,
            'user_id'     => $participantId,
            'method'      => $checkinMethod,
            'by'          => (int) $user['id'],
        ]);

        jsonResponse(201, true, 'Presença registrada: ' . $participant['name'], $payload);
    } catch (Exception $e) {
        error_log('[TW26] admin/attendance POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao registrar a presença.');
    }
}

/* ─── DELETE: desfazer presença registrada por engano ────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);

    $activityId = (int) ($data['activity_id'] ?? ($_GET['activity_id'] ?? 0));
    $targetId   = (int) ($data['user_id'] ?? ($_GET['user_id'] ?? 0));

    requireActivityInScope($scope, $activityId);
    if ($targetId <= 0) {
        jsonResponse(422, false, 'Participante inválido.');
    }

    try {
        $del = $pdo->prepare(
            'DELETE FROM activity_attendance WHERE user_id = :uid AND activity_id = :aid'
        );
        $del->execute([':uid' => $targetId, ':aid' => $activityId]);

        if ($del->rowCount() === 0) {
            jsonResponse(404, false, 'Presença não encontrada.');
        }

        appLog('attendance.undo', [
            'activity_id' => $activityId,
            'user_id'     => $targetId,
            'by'          => (int) $user['id'],
        ]);

        jsonResponse(200, true, 'Presença desfeita.');
    } catch (Exception $e) {
        error_log('[TW26] admin/attendance DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao desfazer a presença.');
    }
}

jsonResponse(405, false, 'Método não permitido.');
