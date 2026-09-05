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

function cleanCategory(mixed $value): string
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
        $where[] = 'expense_date >= :from';
        $params[':from'] = $from;
    }
    if ($to !== '') {
        $where[] = 'expense_date <= :to';
        $params[':to'] = $to;
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    try {
        $stmt = $pdo->prepare(
            "SELECT e.id, e.category, e.description, e.amount, e.expense_date,
                    COALESCE(u.name, '') AS created_by_name
             FROM expenses e
             LEFT JOIN users u ON u.id = e.created_by
             $sqlWhere
             ORDER BY e.expense_date DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['amount'] = (float) $row['amount'];
        }
        unset($row);
        jsonResponse(200, true, 'ok', ['expenses' => $rows]);
    } catch (Exception $e) {
        error_log('[TW26] admin/expenses GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar despesas.');
    }
}

/* ─── POST ───────────────────────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $category    = cleanCategory($data['category'] ?? '');
    $description = cleanCategory($data['description'] ?? '');
    $amount      = round((float) ($data['amount'] ?? 0), 2);
    $date        = ($data['expense_date'] ?? '') !== '' ? $data['expense_date'] : null;

    if ($category === '' || $description === '' || $amount <= 0) {
        jsonResponse(422, false, 'Preencha categoria, descrição e um valor positivo.');
    }

    try {
        $pdo->prepare(
            'INSERT INTO expenses (category, description, amount, expense_date, created_by)
             VALUES (:cat, :desc, :amount, COALESCE(:date, NOW()), :by)'
        )->execute([
            ':cat'     => $category,
            ':desc'    => $description,
            ':amount'  => sprintf('%.2f', $amount),
            ':date'    => $date,
            ':by'      => $user['id'],
        ]);
        jsonResponse(201, true, 'Despesa lançada.');
    } catch (Exception $e) {
        error_log('[TW26] admin/expenses POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao lançar despesa.');
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
    $category    = cleanCategory($data['category'] ?? '');
    $description = cleanCategory($data['description'] ?? '');
    $amount      = round((float) ($data['amount'] ?? 0), 2);
    $date        = ($data['expense_date'] ?? '') !== '' ? $data['expense_date'] : null;

    if ($id <= 0 || $category === '' || $description === '' || $amount <= 0) {
        jsonResponse(422, false, 'Dados inválidos.');
    }

    try {
        $pdo->prepare(
            'UPDATE expenses
             SET category = :cat, description = :desc, amount = :amount, expense_date = :date,
                 updated_at = NOW()
             WHERE id = :id'
        )->execute([
            ':cat'     => $category,
            ':desc'    => $description,
            ':amount'  => sprintf('%.2f', $amount),
            ':date'    => $date,
            ':id'      => $id,
        ]);
        jsonResponse(200, true, 'Despesa atualizada.');
    } catch (Exception $e) {
        error_log('[TW26] admin/expenses PUT: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao atualizar despesa.');
    }
}

/* ─── DELETE ─────────────────────────────────────────────────────────────── */
if ($method === 'DELETE') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    $id   = (int) ($data['id'] ?? ($_GET['id'] ?? 0));

    if ($id <= 0) {
        jsonResponse(422, false, 'Despesa inválida.');
    }

    try {
        $pdo->prepare('DELETE FROM expenses WHERE id = :id')->execute([':id' => $id]);
        jsonResponse(200, true, 'Despesa removida.');
    } catch (Exception $e) {
        error_log('[TW26] admin/expenses DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao remover despesa.');
    }
}

jsonResponse(405, false, 'Método não permitido.');