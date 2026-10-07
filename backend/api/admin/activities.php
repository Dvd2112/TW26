<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/attendance.php';
require_once __DIR__ . '/../../config/activities.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'content_admin']);

$method = $_SERVER['REQUEST_METHOD'];

function cleanActText(mixed $value): string
{
    return htmlspecialchars(strip_tags(trim((string) $value)), ENT_QUOTES, 'UTF-8');
}

/* ─── GET ────────────────────────────────────────────────────────────────── */
if ($method === 'GET') {
    try {
        // Lista de inscritos por atividade
        if (isset($_GET['enrollments'])) {
            $rows = $pdo->query(
                'SELECT e.activity_id, u.id AS user_id, u.name, u.email, e.enrolled_at
                 FROM activity_enrollments e
                 JOIN users u ON u.id = e.user_id
                 ORDER BY e.activity_id, u.name'
            )->fetchAll();
            jsonResponse(200, true, 'ok', ['enrollments' => $rows]);
        }

        $activities = $pdo->query(
            'SELECT a.*,
                    (SELECT count(*) FROM activity_enrollments e WHERE e.activity_id = a.id) AS enrolled,
                    (SELECT count(*) FROM activity_attendance at WHERE at.activity_id = a.id) AS attended
             FROM activities a ORDER BY a.start_at ASC NULLS LAST, a.id ASC'
        )->fetchAll();
        $earlyRows = $pdo->query('SELECT activity_id, lote_id FROM activity_early_lotes')->fetchAll();
        $earlyByActivity = [];
        foreach ($earlyRows as $er) {
            $earlyByActivity[(int) $er['activity_id']][] = (int) $er['lote_id'];
        }
        foreach ($activities as &$activity) {
            $activity['early_lote_ids'] = $earlyByActivity[(int) $activity['id']] ?? [];
            $activity['early_window_minutes'] = $activity['early_window_minutes'] !== null
                ? (int) $activity['early_window_minutes'] : null;
            $activity['enrolled'] = (int) $activity['enrolled'];
            $activity['attended'] = (int) $activity['attended'];
            $activity['capacity'] = $activity['capacity'] !== null ? (int) $activity['capacity'] : null;
            $activity['is_published'] = dbBool($activity['is_published']);
        }
        unset($activity);
        $lotes = $pdo->query('SELECT id, name FROM lotes ORDER BY order_index, id')->fetchAll();
        jsonResponse(200, true, 'ok', ['activities' => $activities, 'lotes' => $lotes]);
    } catch (Exception $e) {
        error_log('[TW26] admin/activities GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar atividades.');
    }
}

/* ─── POST ───────────────────────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $title    = cleanActText($data['title'] ?? '');
    $type     = cleanActText($data['type'] ?? '');
    $allowed  = ['palestra', 'workshop', 'oficina'];
    if ($title === '' || !in_array($type, $allowed, true)) {
        jsonResponse(422, false, 'Informe título e um tipo válido.');
    }

    $desc    = cleanActText($data['description'] ?? '');
    $speaker = cleanActText($data['speaker_name'] ?? '');
    $bio     = cleanActText($data['speaker_bio'] ?? '');
    $location = cleanActText($data['location'] ?? '');
    $capacity = ($data['capacity'] ?? '') !== '' ? (int) $data['capacity'] : null;
    $startAt = ($data['start_at'] ?? '') !== '' ? $data['start_at'] : null;
    $endAt   = ($data['end_at'] ?? '') !== '' ? $data['end_at'] : null;
    // PDO com prepares reais (ATTR_EMULATE_PREPARES=false) converte bool false
    // para string vazia ao fazer bind — o Postgres rejeita isso como boolean
    // inválido. Envia 'true'/'false' como texto, que o Postgres aceita.
    $published = ($data['is_published'] ?? false) ? 'true' : 'false';

    if ($capacity !== null && $capacity <= 0) {
        jsonResponse(422, false, 'Capacidade inválida.');
    }

    $early = parseEarlyAccess($pdo, $data);
    if (is_string($early)) {
        jsonResponse(422, false, $early);
    }

    try {
        $pdo->beginTransaction();
        $ins = $pdo->prepare(
            'INSERT INTO activities (title, type, description, speaker_name, speaker_bio,
                                     location, capacity, start_at, end_at, is_published, published_at, early_window_minutes)
             VALUES (:title, :type, :desc, :speaker, :bio, :location, :capacity, :start, :end, :pub, CASE WHEN :pub2 THEN NOW() END, :early_min)
             RETURNING id'
        );
        $ins->execute([
            ':title'    => $title,
            ':type'     => $type,
            ':desc'     => $desc,
            ':speaker'  => $speaker,
            ':bio'      => $bio,
            ':location' => $location,
            ':capacity' => $capacity,
            ':start'    => $startAt,
            ':end'      => $endAt,
            ':pub'      => $published,
            ':pub2'     => $published,
            ':early_min' => $early['minutes'],
        ]);
        saveEarlyLotes($pdo, (int) $ins->fetchColumn(), $early['lotes']);
        $pdo->commit();
        jsonResponse(201, true, 'Atividade criada.');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TW26] admin/activities POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao criar atividade.');
    }
}

/* ─── PUT ────────────────────────────────────────────────────────────────── */
if ($method === 'PUT') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $id       = (int) ($data['id'] ?? 0);

    // Gerar um novo código de presença é uma ação isolada: não exige o resto do
    // formulário (serve para invalidar um código que vazou durante o evento).
    if (($data['regenerate_code'] ?? false) === true) {
        if ($id <= 0) {
            jsonResponse(422, false, 'Atividade inválida.');
        }
        try {
            $code = generateAttendanceCode(3);
            $pdo->prepare(
                'UPDATE activities SET attendance_code = :code, updated_at = NOW() WHERE id = :id'
            )->execute([':code' => $code, ':id' => $id]);
            jsonResponse(200, true, 'Novo código gerado.', ['attendance_code' => $code]);
        } catch (Exception $e) {
            error_log('[TW26] admin/activities regenerate: ' . $e->getMessage());
            jsonResponse(500, false, 'Erro ao gerar novo código.');
        }
    }

    // Publicar é uma ação isolada: não exige o resto do formulário. A contagem do
    // acesso antecipado começa na publicação (published_at).
    $action = $data['action'] ?? '';
    if ($action === 'publish' || $action === 'publish_all') {
        if ($action === 'publish' && $id <= 0) {
            jsonResponse(422, false, 'Atividade inválida.');
        }
        try {
            $sql = 'UPDATE activities
                    SET is_published = true, published_at = NOW(), updated_at = NOW()
                    WHERE is_published = false' . ($action === 'publish' ? ' AND id = :id' : '');
            $stmt = $pdo->prepare($sql);
            $stmt->execute($action === 'publish' ? [':id' => $id] : []);
            $count = $stmt->rowCount();
            jsonResponse(200, true, $count === 1 ? '1 atividade publicada.' : "{$count} atividades publicadas.", ['published' => $count]);
        } catch (Exception $e) {
            error_log('[TW26] admin/activities publish: ' . $e->getMessage());
            jsonResponse(500, false, 'Erro ao publicar.');
        }
    }

    $title    = cleanActText($data['title'] ?? '');
    $type     = cleanActText($data['type'] ?? '');
    $allowed  = ['palestra', 'workshop', 'oficina'];

    if ($id <= 0 || $title === '' || !in_array($type, $allowed, true)) {
        jsonResponse(422, false, 'Dados inválidos.');
    }

    $desc    = cleanActText($data['description'] ?? '');
    $speaker = cleanActText($data['speaker_name'] ?? '');
    $bio     = cleanActText($data['speaker_bio'] ?? '');
    $location = cleanActText($data['location'] ?? '');
    $capacity = ($data['capacity'] ?? '') !== '' ? (int) $data['capacity'] : null;
    $startAt = ($data['start_at'] ?? '') !== '' ? $data['start_at'] : null;
    $endAt   = ($data['end_at'] ?? '') !== '' ? $data['end_at'] : null;
    // PDO com prepares reais (ATTR_EMULATE_PREPARES=false) converte bool false
    // para string vazia ao fazer bind — o Postgres rejeita isso como boolean
    // inválido. Envia 'true'/'false' como texto, que o Postgres aceita.
    $published = ($data['is_published'] ?? false) ? 'true' : 'false';

    if ($capacity !== null && $capacity <= 0) {
        jsonResponse(422, false, 'Capacidade inválida.');
    }

    $early = parseEarlyAccess($pdo, $data);
    if (is_string($early)) {
        jsonResponse(422, false, $early);
    }

    try {
        $pdo->beginTransaction();

        // Mudou lotes ou antecedência de uma atividade já publicada: a contagem
        // recomeça agora (senão a janela antiga já teria expirado e todos entrariam).
        $cur = $pdo->prepare(
            'SELECT early_window_minutes,
                    COALESCE((SELECT array_agg(lote_id ORDER BY lote_id) FROM activity_early_lotes WHERE activity_id = :id), \'{}\') AS lotes
             FROM activities WHERE id = :id2'
        );
        $cur->execute([':id' => $id, ':id2' => $id]);
        $before = $cur->fetch();
        $newLotes = $early['lotes'];
        sort($newLotes);
        $oldLotes = $before !== false ? array_map('intval', array_filter(explode(',', trim((string) $before['lotes'], '{}')), 'strlen')) : [];
        $oldMin   = $before !== false && $before['early_window_minutes'] !== null ? (int) $before['early_window_minutes'] : null;
        $restart  = ($newLotes !== $oldLotes || $early['minutes'] !== $oldMin) && $newLotes !== [];

        $pdo->prepare(
            'UPDATE activities
             SET title = :title, type = :type, description = :desc, speaker_name = :speaker,
                 speaker_bio = :bio, location = :location, capacity = :capacity,
                 start_at = :start, end_at = :end, is_published = :pub,
                 published_at = CASE WHEN :pub2 THEN (CASE WHEN :restart THEN NOW() ELSE COALESCE(published_at, NOW()) END) END,
                 early_window_minutes = :early_min,
                 updated_at = NOW()
             WHERE id = :id'
        )->execute([
            ':title'    => $title,
            ':type'     => $type,
            ':desc'     => $desc,
            ':speaker'  => $speaker,
            ':bio'      => $bio,
            ':location' => $location,
            ':capacity' => $capacity,
            ':start'    => $startAt,
            ':end'      => $endAt,
            ':pub'      => $published,
            ':pub2'     => $published,
            ':restart'  => $restart ? 'true' : 'false',
            ':early_min' => $early['minutes'],
            ':id'       => $id,
        ]);
        saveEarlyLotes($pdo, $id, $early['lotes']);
        $pdo->commit();
        jsonResponse(200, true, 'Atividade atualizada.');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TW26] admin/activities PUT: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao atualizar atividade.');
    }
}

/* ─── DELETE ─────────────────────────────────────────────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    $id   = (int) ($data['id'] ?? ($_GET['id'] ?? 0));

    if ($id <= 0) {
        jsonResponse(422, false, 'Atividade inválida.');
    }

    try {
        $pdo->prepare('DELETE FROM activities WHERE id = :id')->execute([':id' => $id]);
        jsonResponse(200, true, 'Atividade removida.');
    } catch (Exception $e) {
        error_log('[TW26] admin/activities DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao remover atividade.');
    }
}

jsonResponse(405, false, 'Método não permitido.');