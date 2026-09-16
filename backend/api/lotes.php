<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/database.php';

corsHeaders();
requireMethod('GET');

try {
    $pdo = getDbConnection();

    $stmt = $pdo->query(
        'SELECT l.id, l.name, l.price, l.capacity, l.volunteer_discount_percent,
                l.starts_at, l.ends_at, l.is_active,
                (SELECT count(*) FROM registrations r
                  WHERE r.lote_id = l.id AND r.status <> \'cancelled\') AS enrolled
         FROM lotes l
         WHERE l.is_active = true
           AND (l.starts_at IS NULL OR l.starts_at <= NOW())
           AND (l.ends_at   IS NULL OR l.ends_at   >= NOW())
         ORDER BY l.order_index ASC'
    );
    $lotes = $stmt->fetchAll();

    foreach ($lotes as &$lote) {
        $lote['price']     = (float) $lote['price'];
        $lote['discount']  = (float) $lote['volunteer_discount_percent'];
        $lote['enrolled']  = (int) $lote['enrolled'];
        $lote['available'] = max(0, (int) $lote['capacity'] - $lote['enrolled']);
        $lote['is_full']   = $lote['available'] <= 0;
        unset($lote['volunteer_discount_percent']);
    }
    unset($lote);

    jsonResponse(200, true, 'ok', ['lotes' => $lotes]);
} catch (Exception $e) {
    error_log('[TW26] lotes.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro ao carregar lotes.');
}