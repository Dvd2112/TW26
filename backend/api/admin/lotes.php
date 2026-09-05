<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'registration_admin']);

function sanitizeText(mixed $value): string
{
    return htmlspecialchars(strip_tags(trim((string) $value)), ENT_QUOTES, 'UTF-8');
}

const ALLOWED_LOTE_INSTITUTIONS = ['UTFPR', 'CESUL', 'UNIPAR', 'outros'];

/** '' ou ausente = NULL (lote genérico, vale para qualquer instituição). */
function parseLoteInstitution(mixed $value): ?string
{
    $trimmed = trim((string) $value);
    return $trimmed === '' ? null : $trimmed;
}

/**
 * Garante que só exista um lote ativo por instituição por vez (NULL conta
 * como escopo próprio — "genérico"). Chamar antes de ativar um lote.
 */
function deactivateConflictingLotes(PDO $pdo, ?string $institution, int $excludeId = 0): void
{
    $pdo->prepare(
        'UPDATE lotes SET is_active = false
         WHERE is_active = true
           AND institution IS NOT DISTINCT FROM :institution
           AND id <> :exclude_id'
    )->execute([':institution' => $institution, ':exclude_id' => $excludeId]);
}

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: lista de lotes (inclui inativos) ──────────────────────────────── */
if ($method === 'GET') {
    try {
        $lotes = $pdo->query(
            'SELECT l.*,
                    (SELECT count(*) FROM registrations r
                      WHERE r.lote_id = l.id AND r.status <> \'cancelled\') AS enrolled
             FROM lotes l ORDER BY l.order_index'
        )->fetchAll();
        foreach ($lotes as &$lote) {
            $lote['price']     = (float) $lote['price'];
            $lote['discount']  = (float) $lote['volunteer_discount_percent'];
            $lote['enrolled']  = (int) $lote['enrolled'];
            $lote['available'] = max(0, (int) $lote['capacity'] - $lote['enrolled']);
            // PDO_PGSQL retorna boolean como texto 't'/'f', não como PHP bool
            $lote['is_active'] = $lote['is_active'] === 't';
            unset($lote['volunteer_discount_percent']);
        }
        unset($lote);
        jsonResponse(200, true, 'ok', ['lotes' => $lotes]);
    } catch (Exception $e) {
        error_log('[TW26] admin/lotes GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar lotes.');
    }
}

/* ─── POST: criar ────────────────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $name        = sanitizeText($data['name'] ?? '');
    $institution = parseLoteInstitution($data['institution'] ?? '');
    $price       = round((float) ($data['price'] ?? 0), 2);
    $capacity    = (int) ($data['capacity'] ?? 0);
    $order       = (int) ($data['order_index'] ?? 0);
    $discount    = (float) ($data['discount'] ?? 0);
    // PDO com prepares reais (ATTR_EMULATE_PREPARES=false) converte bool false
    // para string vazia ao fazer bind — o Postgres rejeita isso como boolean
    // inválido. Envia 'true'/'false' como texto, que o Postgres aceita.
    $active   = ($data['is_active'] ?? false) ? 'true' : 'false';
    $startsAt = ($data['starts_at'] ?? '') !== '' ? $data['starts_at'] : null;
    $endsAt   = ($data['ends_at'] ?? '') !== '' ? $data['ends_at'] : null;

    if ($name === '' || $price < 0 || $capacity <= 0) {
        jsonResponse(422, false, 'Preencha nome, preço e capacidade válidos.');
    }
    if ($discount < 0 || $discount > 100) {
        jsonResponse(422, false, 'Desconto deve estar entre 0 e 100.');
    }
    if ($institution !== null && !in_array($institution, ALLOWED_LOTE_INSTITUTIONS, true)) {
        jsonResponse(422, false, 'Instituição inválida.');
    }

    try {
        if ($active === 'true') {
            deactivateConflictingLotes($pdo, $institution);
        }

        $pdo->prepare(
            'INSERT INTO lotes (name, institution, price, capacity, order_index, volunteer_discount_percent, is_active, starts_at, ends_at)
             VALUES (:name, :institution, :price, :capacity, :order, :discount, :active, :starts, :ends)'
        )->execute([
            ':name'        => $name,
            ':institution' => $institution,
            ':price'       => sprintf('%.2f', $price),
            ':capacity'    => $capacity,
            ':order'       => $order,
            ':discount'    => sprintf('%.2f', $discount),
            ':active'      => $active,
            ':starts'      => $startsAt,
            ':ends'        => $endsAt,
        ]);
        jsonResponse(201, true, 'Lote criado.');
    } catch (Exception $e) {
        error_log('[TW26] admin/lotes POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao criar lote.');
    }
}

/* ─── PUT: atualizar ─────────────────────────────────────────────────────── */
if ($method === 'PUT') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $id          = (int) ($data['id'] ?? 0);
    $name        = sanitizeText($data['name'] ?? '');
    $institution = parseLoteInstitution($data['institution'] ?? '');
    $price       = round((float) ($data['price'] ?? 0), 2);
    $capacity    = (int) ($data['capacity'] ?? 0);
    $order       = (int) ($data['order_index'] ?? 0);
    $discount    = (float) ($data['discount'] ?? 0);
    // PDO com prepares reais (ATTR_EMULATE_PREPARES=false) converte bool false
    // para string vazia ao fazer bind — o Postgres rejeita isso como boolean
    // inválido. Envia 'true'/'false' como texto, que o Postgres aceita.
    $active   = ($data['is_active'] ?? false) ? 'true' : 'false';
    $startsAt = ($data['starts_at'] ?? '') !== '' ? $data['starts_at'] : null;
    $endsAt   = ($data['ends_at'] ?? '') !== '' ? $data['ends_at'] : null;

    if ($id <= 0 || $name === '' || $price < 0 || $capacity <= 0) {
        jsonResponse(422, false, 'Dados inválidos.');
    }
    if ($institution !== null && !in_array($institution, ALLOWED_LOTE_INSTITUTIONS, true)) {
        jsonResponse(422, false, 'Instituição inválida.');
    }

    try {
        if ($active === 'true') {
            deactivateConflictingLotes($pdo, $institution, $id);
        }

        $res = $pdo->prepare(
            'UPDATE lotes
             SET name = :name, institution = :institution, price = :price, capacity = :capacity,
                 order_index = :order, volunteer_discount_percent = :discount, is_active = :active,
                 starts_at = :starts, ends_at = :ends
             WHERE id = :id'
        )->execute([
            ':name'        => $name,
            ':institution' => $institution,
            ':price'       => sprintf('%.2f', $price),
            ':capacity'    => $capacity,
            ':order'       => $order,
            ':discount'    => sprintf('%.2f', $discount),
            ':active'      => $active,
            ':starts'      => $startsAt,
            ':ends'        => $endsAt,
            ':id'          => $id,
        ]);
        if (!$res) {
            jsonResponse(404, false, 'Lote não encontrado.');
        }
        jsonResponse(200, true, 'Lote atualizado.');
    } catch (Exception $e) {
        error_log('[TW26] admin/lotes PUT: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao atualizar lote.');
    }
}

/* ─── DELETE: remover ────────────────────────────────────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    $id   = (int) ($data['id'] ?? ($_GET['id'] ?? 0));

    if ($id <= 0) {
        jsonResponse(422, false, 'Lote inválido.');
    }

    try {
        $pdo->prepare('DELETE FROM lotes WHERE id = :id')->execute([':id' => $id]);
        jsonResponse(200, true, 'Lote removido.');
    } catch (Exception $e) {
        error_log('[TW26] admin/lotes DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao remover lote.');
    }
}

jsonResponse(405, false, 'Método não permitido.');