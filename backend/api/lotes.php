<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/lotes.php';

corsHeaders();
requireMethod('GET');

try {
    $pdo = getDbConnection();

    // Lotes do perfil atual são exibidos normalmente. O lote de voluntário é
    // uma vitrine para todos, mas a API de inscrição só o aceita para quem já
    // possui esse perfil.
    $viewer     = currentUser();
    $viewerType = $viewer['participant_type'] ?? 'participant';

    $params = [':participant_type' => $viewerType];
    $institutionClause = '';
    if ($viewer !== null) {
        // A frente de voluntariado é comum ao evento inteiro; por isso seus
        // lotes não são ocultados por instituição.
        $institutionClause = "AND (l.participant_type = 'volunteer' OR l.institution = :institution OR l.institution IS NULL)";
        $params[':institution'] = $viewer['institution'];
    }

    $stmt = $pdo->prepare(
        'SELECT l.id, l.name, l.institution, l.participant_type, l.price, l.capacity,
                l.volunteer_discount_percent, l.starts_at, l.ends_at, l.is_active,
                (l.qr_code_path IS NOT NULL) AS has_qr,
                (SELECT count(*) FROM registrations r
                  WHERE r.lote_id = l.id AND ' . loteOccupiesSlotSql('r') . ') AS enrolled
         FROM lotes l
         WHERE l.is_active = true
           AND (l.participant_type = :participant_type OR l.participant_type = \'volunteer\')
           ' . $institutionClause . '
           AND (l.starts_at IS NULL OR l.starts_at <= NOW())
           AND (l.ends_at   IS NULL OR l.ends_at   >= NOW())
         ORDER BY l.order_index ASC'
    );
    $stmt->execute($params);
    $lotes = $stmt->fetchAll();

    foreach ($lotes as &$lote) {
        $lote['price']       = (float) $lote['price'];
        $lote['discount']    = (float) $lote['volunteer_discount_percent'];
        $lote['final_price'] = loteFinalPrice($lote['price'], $lote['discount'], $viewerType);
        $lote['has_qr']      = dbBool($lote['has_qr']);
        $lote['enrolled']    = (int) $lote['enrolled'];
        $lote['available']   = max(0, (int) $lote['capacity'] - $lote['enrolled']);
        $lote['is_full']     = $lote['available'] <= 0;
        unset($lote['volunteer_discount_percent']);
    }
    unset($lote);

    jsonResponse(200, true, 'ok', ['lotes' => $lotes]);
} catch (Exception $e) {
    error_log('[TW26] lotes.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro ao carregar lotes.');
}
