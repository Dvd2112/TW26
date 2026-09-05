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

function cleanRevCategory(mixed $value): string
{
    return htmlspecialchars(strip_tags(trim((string) $value)), ENT_QUOTES, 'UTF-8');
}

/* ─── GET ────────────────────────────────────────────────────────────────── */
if ($method === 'GET') {
    $from = trim($_GET['from'] ?? '');
    $to   = trim($_GET['to'] ?? '');

    $where  = [];
    $params = [];
    if ($from !== '') {
        $where[] = 'received_at >= :from';
        $params[':from'] = $from;
    }
    if ($to !== '') {
        $where[] = 'received_at <= :to';
        $params[':to'] = $to;
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    try {
        $stmt = $pdo->prepare(
            "SELECT r.id, r.category, r.description, r.amount, r.received_at,
                    COALESCE(u.name, '') AS created_by_name
             FROM revenues r
             LEFT JOIN users u ON u.id = r.created_by
             $sqlWhere
             ORDER BY r.received_at DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['amount'] = (float) $row['amount'];
        }
        unset($row);
        jsonResponse(200, true, 'ok', ['revenues' => $rows]);
    } catch (Exception $e) {
        error_log('[TW26] admin/revenues GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar receitas.');
    }
}

/* ─── POST ───────────────────────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $category    = cleanRevCategory($data['category'] ?? '');
    $description = cleanRevCategory($data['description'] ?? '');
    $amount      = round((float) ($data['amount'] ?? 0), 2);
    $date        = ($data['received_at'] ?? '') !== '' ? $data['received_at'] : null;

    if ($category === '' || $description === '' || $amount <= 0) {
        jsonResponse(422, false, 'Preencha categoria, descrição e um valor positivo.');
    }

    try {
$pdo->prepare(
            'INSERT INTO revenues (category, description, amount, received_at, created_by)
             VALUES (:cat, :desc, :amount, COALESCE(:date, NOW()), :by)'
        )->execute([
            ':cat'     => $category,
            ':desc'    => $description,
            ':amount'  => sprintf('%.2f', $amount),
            ':date'    => $date,
            ':by'      => $user['id'],
        ]);
        jsonResponse(201, true, 'Receita lançada.');
    } catch (Exception $e) {
        error_log('[TW26] admin/revenues POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao lançar receita.');
    }
}

/* ─── PUT ────────────────────────────────────────────────────────────────── */
if ($method === 'PUT') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $id          = (int) ($data['id'] ?? 0);
    $category    = cleanRevCategory($data['category'] ?? '');
    $description = cleanRevCategory($data['description'] ?? '');
    $amount      = round((float) ($data['amount'] ?? 0), 2);
    $date        = ($data['received_at'] ?? '') !== '' ? $data['received_at'] : null;

    if ($id <= 0 || $category === '' || $description === '' || $amount <= 0) {
        jsonResponse(422, false, 'Dados inválidos.');
    }

    try {
        $pdo->prepare(
            'UPDATE revenues
             SET category = :cat, description = :desc, amount = :amount, received_at = :date,
                 updated_at = NOW()
             WHERE id = :id'
        )->execute([
            ':cat'     => $category,
            ':desc'    => $description,
            ':amount'  => sprintf('%.2f', $amount),
            ':date'    => $date,
            ':id'      => $id,
        ]);
        jsonResponse(200, true, 'Receita atualizada.');
    } catch (Exception $e) {
        error_log('[TW26] admin/revenues PUT: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao atualizar receita.');
    }
}

/* ─── DELETE ─────────────────────────────────────────────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    $id   = (int) ($data['id'] ?? ($_GET['id'] ?? 0));

    if ($id <= 0) {
        jsonResponse(422, false, 'Receita inválida.');
    }

    try {
        $pdo->prepare('DELETE FROM revenues WHERE id = :id')->execute([':id' => $id]);
        jsonResponse(200, true, 'Receita removida.');
    } catch (Exception $e) {
        error_log('[TW26] admin/revenues DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao remover receita.');
    }
}

jsonResponse(405, false, 'Método não permitido.');