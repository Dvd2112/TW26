<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';

corsHeaders();
requireMethod('GET');

requireAnyPermission(['super_admin', 'registration_admin', 'content_admin']);

try {
    $pdo = getDbConnection();

    $inscritosPorTipo = $pdo->query(
        "SELECT participant_type AS tipo, count(*) AS total
         FROM registrations WHERE status <> 'cancelled'
         GROUP BY participant_type"
    )->fetchAll();

    $inscricoesPorStatus = $pdo->query(
        'SELECT status, count(*) AS total FROM registrations GROUP BY status'
    )->fetchAll();

    $pagamentosPorStatus = $pdo->query(
        'SELECT status, count(*) AS total FROM payments GROUP BY status'
    )->fetchAll();

    $vagasPorLote = $pdo->query(
        'SELECT l.id, l.name, l.capacity, l.is_active,
                (SELECT count(*) FROM registrations r
                  WHERE r.lote_id = l.id AND r.status <> \'cancelled\') AS enrolled
         FROM lotes l ORDER BY l.order_index'
    )->fetchAll();
    foreach ($vagasPorLote as &$lote) {
        // PDO_PGSQL retorna boolean como texto 't'/'f', não como PHP bool
        $lote['is_active'] = $lote['is_active'] === 't';
    }
    unset($lote);

    $oficinas = $pdo->query(
        'SELECT a.id, a.title,
                (SELECT count(*) FROM activity_enrollments e WHERE e.activity_id = a.id) AS enrolled
         FROM activities a ORDER BY a.id'
    )->fetchAll();

    $totalUsers = (int) $pdo->query('SELECT count(*) FROM users')->fetchColumn();
    $totalAdmins = (int) $pdo->query(
        'SELECT count(DISTINCT user_id) FROM user_permissions'
    )->fetchColumn();

    jsonResponse(200, true, 'ok', [
        'inscritos_por_tipo'  => $inscritosPorTipo,
        'inscricoes_por_status' => $inscricoesPorStatus,
        'pagamentos_por_status' => $pagamentosPorStatus,
        'vagas_por_lote'      => $vagasPorLote,
        'oficinas'            => $oficinas,
        'total_users'         => $totalUsers,
        'total_admins'        => $totalAdmins,
    ]);
} catch (Exception $e) {
    error_log('[TW26] dashboard.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro ao carregar o painel.');
}