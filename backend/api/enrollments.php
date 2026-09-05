<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';

corsHeaders();
requireCsrf();

$user = requireLogin();
$pdo  = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: minhas inscrições ─────────────────────────────────────────────── */
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare(
            'SELECT a.id, a.title, a.type, a.location, a.start_at, a.end_at,
                    a.speaker_name, e.enrolled_at
             FROM activity_enrollments e
             JOIN activities a ON a.id = e.activity_id
             WHERE e.user_id = :uid
             ORDER BY e.enrolled_at DESC'
        );
        $stmt->execute([':uid' => $user['id']]);
        jsonResponse(200, true, 'ok', ['enrollments' => $stmt->fetchAll()]);
    } catch (Exception $e) {
        error_log('[TW26] enrollments.php GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar suas inscrições.');
    }
}

/* ─── POST: inscrever ────────────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $activityId = (int) ($data['activity_id'] ?? 0);
    if ($activityId <= 0) {
        jsonResponse(422, false, 'Atividade inválida.');
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'SELECT id, capacity, is_published FROM activities WHERE id = :id FOR UPDATE'
        );
        $stmt->execute([':id' => $activityId]);
        $activity = $stmt->fetch();

        if ($activity === false || !$activity['is_published']) {
            $pdo->rollBack();
            jsonResponse(422, false, 'Atividade indisponível.');
        }

        $dup = $pdo->prepare(
            'SELECT id FROM activity_enrollments WHERE user_id = :uid AND activity_id = :aid'
        );
        $dup->execute([':uid' => $user['id'], ':aid' => $activityId]);
        if ($dup->fetch() !== false) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Você já está inscrito nesta atividade.');
        }

        if ($activity['capacity'] !== null) {
            $count = $pdo->prepare(
                'SELECT count(*) FROM activity_enrollments WHERE activity_id = :aid'
            );
            $count->execute([':aid' => $activityId]);
            if ((int) $count->fetchColumn() >= (int) $activity['capacity']) {
                $pdo->rollBack();
                jsonResponse(409, false, 'Atividade lotada.');
            }
        }

        $pdo->prepare(
            'INSERT INTO activity_enrollments (user_id, activity_id) VALUES (:uid, :aid)'
        )->execute([':uid' => $user['id'], ':aid' => $activityId]);

        $pdo->commit();
        jsonResponse(201, true, 'Inscrição na atividade confirmada!');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TW26] enrollments.php POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao se inscrever na atividade.');
    }
}

/* ─── DELETE: cancelar inscrição ─────────────────────────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    $activityId = (int) ($data['activity_id'] ?? ($_GET['activity_id'] ?? 0));

    if ($activityId <= 0) {
        jsonResponse(422, false, 'Atividade inválida.');
    }

    try {
        $del = $pdo->prepare(
            'DELETE FROM activity_enrollments WHERE user_id = :uid AND activity_id = :aid'
        );
        $del->execute([':uid' => $user['id'], ':aid' => $activityId]);

        if ($del->rowCount() === 0) {
            jsonResponse(404, false, 'Inscrição não encontrada.');
        }
        jsonResponse(200, true, 'Inscrição cancelada.');
    } catch (Exception $e) {
        error_log('[TW26] enrollments.php DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao cancelar a inscrição.');
    }
}

jsonResponse(405, false, 'Método não permitido.');