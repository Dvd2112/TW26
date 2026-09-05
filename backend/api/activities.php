<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';

corsHeaders();
requireMethod('GET');

$user = currentUser();

try {
    $pdo = getDbConnection();

    $sql = 'SELECT a.id, a.title, a.type, a.description, a.location,
                   a.capacity, a.start_at, a.end_at, a.speaker_name,
                   (SELECT count(*) FROM activity_enrollments e
                     WHERE e.activity_id = a.id) AS enrolled
            FROM activities a
            WHERE a.is_published = true
            ORDER BY a.start_at ASC NULLS LAST, a.id ASC';

    $activities = $pdo->query($sql)->fetchAll();

    // Minhas inscrições (se logado)
    $myIds = [];
    if ($user !== null) {
        $stmt = $pdo->prepare(
            'SELECT activity_id FROM activity_enrollments WHERE user_id = :uid'
        );
        $stmt->execute([':uid' => $user['id']]);
        $myIds = array_column($stmt->fetchAll(), 'activity_id');
    }

    foreach ($activities as &$activity) {
        $activity['enrolled']  = (int) $activity['enrolled'];
        $activity['capacity']  = $activity['capacity'] !== null ? (int) $activity['capacity'] : null;
        $activity['available'] = $activity['capacity'] !== null
            ? max(0, $activity['capacity'] - $activity['enrolled'])
            : null;
        $activity['is_full']   = $activity['available'] !== null && $activity['available'] <= 0;
        $activity['is_enrolled'] = in_array((int) $activity['id'], $myIds, true);
    }
    unset($activity);

    jsonResponse(200, true, 'ok', ['activities' => $activities]);
} catch (Exception $e) {
    error_log('[TW26] activities.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro ao carregar atividades.');
}