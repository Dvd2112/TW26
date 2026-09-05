<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';

corsHeaders();
requireMethod('GET');

requireAnyPermission(['super_admin', 'registration_admin']);

$from = trim($_GET['from'] ?? '');
$to   = trim($_GET['to'] ?? '');

try {
    $pdo = getDbConnection();

    // Entradas vindas das inscrições (pagamentos confirmados)
    $parts  = ["p.status = 'paid'"];
    $params = [];
    if ($from !== '') {
        $parts[] = 'p.paid_at >= :from';
        $params[':from'] = $from;
    }
    if ($to !== '') {
        $parts[] = 'p.paid_at <= :to';
        $params[':to'] = $to;
    }
    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS total, count(*) AS total_count
         FROM payments p
         WHERE ' . implode(' AND ', $parts)
    );
    $stmt->execute($params);
    $inscricoes = $stmt->fetch();

    // Entradas extras (revenues)
    $revParts  = [];
    $revParams = [];
    if ($from !== '') {
        $revParts[] = 'received_at >= :from';
        $revParams[':from'] = $from;
    }
    if ($to !== '') {
        $revParts[] = 'received_at <= :to';
        $revParams[':to'] = $to;
    }
    $stmtRev = $pdo->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS total, count(*) AS total_count
         FROM revenues r'
        . ($revParts ? ' WHERE ' . implode(' AND ', $revParts) : '')
    );
    $stmtRev->execute($revParams);
    $outras = $stmtRev->fetch();

    // Saídas (expenses)
    $expParts  = [];
    $expParams = [];
    if ($from !== '') {
        $expParts[] = 'expense_date >= :from';
        $expParams[':from'] = $from;
    }
    if ($to !== '') {
        $expParts[] = 'expense_date <= :to';
        $expParams[':to'] = $to;
    }
    $stmtExp = $pdo->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS total, count(*) AS total_count
         FROM expenses e'
        . ($expParts ? ' WHERE ' . implode(' AND ', $expParts) : '')
    );
    $stmtExp->execute($expParams);
    $saidas = $stmtExp->fetch();

    // Breakdown por categoria (receitas extras + despesas)
    $categorias = [
        'inscricoes' => [
            'tipo'  => 'entrada',
            'total' => (float) $inscricoes['total'],
            'count' => (int) $inscricoes['total_count'],
        ],
    ];

    $revRows = $pdo->query(
        'SELECT category, COALESCE(SUM(amount), 0) AS total, count(*) AS count
         FROM revenues GROUP BY category'
    )->fetchAll();
    foreach ($revRows as $row) {
        $categorias['revenue_' . $row['category']] = [
            'tipo'  => 'entrada',
            'total' => (float) $row['total'],
            'count' => (int) $row['count'],
        ];
    }

    $expRows = $pdo->query(
        'SELECT category, COALESCE(SUM(amount), 0) AS total, count(*) AS count
         FROM expenses GROUP BY category'
    )->fetchAll();
    foreach ($expRows as $row) {
        $categorias['expense_' . $row['category']] = [
            'tipo'  => 'saida',
            'total' => (float) $row['total'],
            'count' => (int) $row['count'],
        ];
    }

    $totalEntradas = (float) $inscricoes['total'] + (float) $outras['total'];
    $totalSaidas   = (float) $saidas['total'];

    jsonResponse(200, true, 'ok', [
        'entradas_inscricoes' => (float) $inscricoes['total'],
        'entradas_outras'     => (float) $outras['total'],
        'total_entradas'      => $totalEntradas,
        'total_saidas'        => $totalSaidas,
        'saldo'               => $totalEntradas - $totalSaidas,
        'categorias'          => $categorias,
    ]);
} catch (Exception $e) {
    error_log('[TW26] financeiro.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro ao calcular o resumo financeiro.');
}