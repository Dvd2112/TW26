<?php
declare(strict_types=1);

/**
 * Presença registrada pelo próprio participante: ele digita o código da
 * atividade (divulgado na sala) numa oficina em que está inscrito.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/attendance.php';

corsHeaders();
requireCsrf();
requireMethod('POST');

$user = requireLogin();
$pdo  = getDbConnection();

/** Tentativas erradas permitidas antes de bloquear, e por quanto tempo contam. */
const SELF_CHECKIN_MAX_FAILS   = 5;
const SELF_CHECKIN_WINDOW_SECS = 600;

/**
 * Throttle por sessão: impede varrer códigos de 6 caracteres por tentativa e erro.
 */
function selfCheckinThrottle(): void
{
    $state = $_SESSION['attendance_fails'] ?? ['count' => 0, 'since' => 0];

    if (time() - (int) $state['since'] > SELF_CHECKIN_WINDOW_SECS) {
        return; // janela expirada, contador será reiniciado no próximo erro
    }
    if ((int) $state['count'] >= SELF_CHECKIN_MAX_FAILS) {
        jsonResponse(429, false, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');
    }
}

/**
 * Registra um erro de código na sessão (e devolve 422 com mensagem genérica).
 */
function selfCheckinFail(string $message): void
{
    $state = $_SESSION['attendance_fails'] ?? ['count' => 0, 'since' => 0];

    if (time() - (int) $state['since'] > SELF_CHECKIN_WINDOW_SECS) {
        $state = ['count' => 0, 'since' => time()];
    }
    $state['count'] = (int) $state['count'] + 1;
    $_SESSION['attendance_fails'] = $state;

    jsonResponse(422, false, $message);
}

selfCheckinThrottle();

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    jsonResponse(400, false, 'JSON inválido.');
}

$activityId = (int) ($data['activity_id'] ?? 0);
$code       = normalizeAttendanceCode($data['code'] ?? '');

if ($activityId <= 0) {
    jsonResponse(422, false, 'Atividade inválida.');
}
if ($code === '') {
    jsonResponse(422, false, 'Informe o código da atividade.');
}

try {
    // A janela é calculada pelo Postgres com NOW(): evita divergência de fuso
    // entre o PHP e o banco. Atividade sem data de início aceita a qualquer hora.
    $stmt = $pdo->prepare(
        "SELECT a.id, a.title, a.attendance_code, a.is_published,
                (a.start_at IS NULL
                 OR NOW() BETWEEN a.start_at - INTERVAL '30 minutes'
                              AND COALESCE(a.end_at, a.start_at + INTERVAL '3 hours')
                                  + INTERVAL '30 minutes') AS in_window
         FROM activities a
         WHERE a.id = :aid
         LIMIT 1"
    );
    $stmt->execute([':aid' => $activityId]);
    $activity = $stmt->fetch();

    if ($activity === false || !dbBool($activity['is_published'])) {
        jsonResponse(422, false, 'Atividade indisponível.');
    }

    $enrolled = $pdo->prepare(
        'SELECT 1 FROM activity_enrollments WHERE user_id = :uid AND activity_id = :aid'
    );
    $enrolled->execute([':uid' => $user['id'], ':aid' => $activityId]);
    if ($enrolled->fetch() === false) {
        jsonResponse(422, false, 'Você não está inscrito nesta atividade.');
    }

    if (!dbBool($activity['in_window'])) {
        jsonResponse(422, false, 'O código só vale durante a atividade.');
    }

    // hash_equals: comparação em tempo constante, mesmo sendo código curto.
    if (!hash_equals(normalizeAttendanceCode($activity['attendance_code']), $code)) {
        selfCheckinFail('Código inválido.');
    }

    $inserted = recordAttendance($pdo, (int) $user['id'], $activityId, 'self', null);

    unset($_SESSION['attendance_fails']);

    if (!$inserted) {
        jsonResponse(409, false, 'Sua presença nesta atividade já estava registrada.');
    }

    appLog('attendance.self', ['activity_id' => $activityId, 'user_id' => (int) $user['id']]);

    jsonResponse(201, true, 'Presença confirmada em ' . $activity['title'] . '!');
} catch (Exception $e) {
    error_log('[TW26] attendance.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao registrar sua presença.');
}
