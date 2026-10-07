<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';

corsHeaders();
requireMethod('GET');

/** Quem pode emitir cada relatório (espelha as permissões das abas correspondentes). */
const REPORT_PERMISSIONS = [
    'registrations' => ['super_admin', 'registration_admin'],
    'lotes'         => ['super_admin', 'registration_admin'],
    'users'         => ['super_admin'],
    'activities'    => ['super_admin', 'content_admin'],
    'financeiro'    => ['super_admin'],
];

const REPORT_MAX_ROWS = 10000;

const REPORT_REG_STATUS  = ['pending' => 'Pendente', 'confirmed' => 'Confirmado', 'cancelled' => 'Cancelado'];
const REPORT_PAY_STATUS  = ['unpaid' => 'Não pago', 'awaiting_confirmation' => 'Em confirmação', 'paid' => 'Pago', 'refunded' => 'Reembolsado'];
const REPORT_USER_TYPES  = ['participant' => 'Normal', 'volunteer' => 'Voluntário', 'staff' => 'Staff'];
const REPORT_INSTITUTIONS = ['ensino_medio' => 'Ensino Médio', 'outros' => 'Outros'];
const REPORT_ACT_TYPES   = ['palestra' => 'Palestra', 'workshop' => 'Workshop', 'oficina' => 'Oficina'];

function reportMaskCpf(string $cpf): string
{
    $digits = preg_replace('/\D/', '', $cpf) ?? '';
    return strlen($digits) === 11 ? substr($digits, 0, 3) . '.***.***-' . substr($digits, 9, 2) : '***';
}

function reportInstitution(?string $v): string
{
    return $v === null ? '' : (REPORT_INSTITUTIONS[$v] ?? $v);
}

function reportYesNo(mixed $v): string
{
    return $v ? 'Sim' : 'Não';
}

/** Valor do filtro dentro da whitelist; vazio = sem filtro; fora dela = 422. */
function reportEnum(string $key, array $allowed): ?string
{
    $v = trim((string) ($_GET[$key] ?? ''));
    if ($v === '') {
        return null;
    }
    if (!in_array($v, $allowed, true)) {
        jsonResponse(422, false, 'Filtro inválido.');
    }
    return $v;
}

/**
 * Filtro de seleção múltipla: `?key[]=a&key[]=b` (ou um valor simples). Com `$allowed`,
 * valor fora da whitelist = 422; com `$numeric`, exige inteiros. Vazio = sem filtro.
 *
 * @return list<string>|null
 */
function reportList(string $key, ?array $allowed = null, bool $numeric = false): ?array
{
    $raw = $_GET[$key] ?? [];
    $values = [];
    foreach ((array) $raw as $v) {
        $v = trim((string) $v);
        if ($v === '') {
            continue;
        }
        if (($allowed !== null && !in_array($v, $allowed, true)) || ($numeric && !ctype_digit($v)) || mb_strlen($v) > 100) {
            jsonResponse(422, false, 'Filtro inválido.');
        }
        $values[] = $v;
    }
    return $values === [] ? null : array_values(array_unique($values));
}

/** Adiciona `coluna IN (...)` com um placeholder por valor. */
function reportIn(string $column, ?array $values, string $prefix, array &$where, array &$params): void
{
    if ($values === null) {
        return;
    }
    $names = [];
    foreach ($values as $i => $v) {
        $names[] = ":{$prefix}_$i";
        $params[":{$prefix}_$i"] = $v;
    }
    $where[] = "$column IN (" . implode(', ', $names) . ')';
}

function reportBool(string $key): ?bool
{
    $v = trim((string) ($_GET[$key] ?? ''));
    return $v === '' ? null : $v === 'true';
}

function reportText(string $key): ?string
{
    $v = trim((string) ($_GET[$key] ?? ''));
    return $v === '' ? null : mb_substr($v, 0, 100);
}

/** Intervalo de datas (YYYY-MM-DD), com o dia final inclusivo. */
function reportDateRange(string $column, array &$where, array &$params, string $prefix): void
{
    foreach (['from' => '>=', 'to' => '<'] as $key => $op) {
        $v = trim((string) ($_GET[$key] ?? ''));
        if ($v === '') {
            continue;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            jsonResponse(422, false, 'Data inválida.');
        }
        $name = ":{$prefix}_$key";
        $where[] = $key === 'to'
            ? "$column $op CAST($name AS date) + 1"
            : "$column $op CAST($name AS date)";
        $params[$name] = $v;
    }
}

/** Busca livre (ILIKE) em várias colunas; o curinga do usuário é escapado. */
function reportSearch(array $columns, array &$where, array &$params): void
{
    $q = reportText('q');
    if ($q === null) {
        return;
    }
    // PDO sem emulação não aceita o mesmo placeholder repetido: um por coluna.
    $parts = [];
    foreach (array_values($columns) as $i => $column) {
        $parts[] = "$column ILIKE :q$i";
        $params[":q$i"] = '%' . addcslashes($q, '%_\\') . '%';
    }
    $where[] = '(' . implode(' OR ', $parts) . ')';
}

function reportFetch(PDO $pdo, string $sql, array $params): array
{
    $stmt = $pdo->prepare($sql . ' LIMIT ' . (REPORT_MAX_ROWS + 1));
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    $truncated = count($rows) > REPORT_MAX_ROWS;
    return [$truncated ? array_slice($rows, 0, REPORT_MAX_ROWS) : $rows, $truncated];
}

function reportWhere(array $where): string
{
    return $where ? ' WHERE ' . implode(' AND ', $where) : '';
}

// ─── Relatórios ──────────────────────────────────────────────────────────────

function reportRegistrations(PDO $pdo): array
{
    $where = [];
    $params = [];
    reportIn('r.lote_id', reportList('lote_id', null, true), 'lote', $where, $params);
    reportIn('r.status', reportList('status', array_keys(REPORT_REG_STATUS)), 'status', $where, $params);
    reportIn('r.payment_status', reportList('payment_status', array_keys(REPORT_PAY_STATUS)), 'pay', $where, $params);
    reportIn('COALESCE(r.participant_type, u.participant_type)', reportList('participant_type', array_keys(REPORT_USER_TYPES)), 'ptype', $where, $params);
    reportIn('u.institution', reportList('institution'), 'inst', $where, $params);
    if (($v = reportText('school')) !== null) { $where[] = 'u.school ILIKE :school'; $params[':school'] = '%' . addcslashes($v, '%_\\') . '%'; }
    if (($v = reportBool('came_from_presave')) !== null) { $where[] = 'r.came_from_presave = ' . ($v ? 'true' : 'false'); }
    reportDateRange('r.registered_at', $where, $params, 'reg');
    reportSearch(['u.name', 'u.email'], $where, $params);

    [$rows, $truncated] = reportFetch($pdo,
        'SELECT r.id, u.name, u.email, u.cpf, u.institution, u.school,
                COALESCE(r.participant_type, u.participant_type) AS participant_type,
                l.name AS lote, r.status, r.payment_status, r.lote_index, r.came_from_presave,
                (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.registration_id = r.id AND p.status = \'paid\') AS paid_amount,
                r.registered_at, r.confirmed_at
         FROM registrations r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN lotes l ON l.id = r.lote_id'
        . reportWhere($where) . ' ORDER BY r.registered_at DESC', $params);

    $byStatus = [];
    $totalPaid = 0.0;
    $out = [];
    foreach ($rows as $r) {
        $byStatus[$r['status']] = ($byStatus[$r['status']] ?? 0) + 1;
        $totalPaid += (float) $r['paid_amount'];
        $out[] = [
            'id'               => (int) $r['id'],
            'name'             => $r['name'],
            'email'            => $r['email'],
            'cpf'              => reportMaskCpf((string) $r['cpf']),
            'institution'      => reportInstitution($r['institution']),
            'school'           => $r['school'] ?? '',
            'participant_type' => REPORT_USER_TYPES[$r['participant_type']] ?? '',
            'lote'             => $r['lote'] ?? '—',
            'status'           => REPORT_REG_STATUS[$r['status']] ?? $r['status'],
            'payment_status'   => REPORT_PAY_STATUS[$r['payment_status']] ?? $r['payment_status'],
            'lote_index'       => $r['lote_index'] !== null ? (int) $r['lote_index'] : null,
            'came_from_presave' => reportYesNo($r['came_from_presave']),
            'paid_amount'      => (float) $r['paid_amount'],
            'registered_at'    => $r['registered_at'],
            'confirmed_at'     => $r['confirmed_at'],
        ];
    }

    return [
        'title'   => 'Relatório de inscritos',
        'columns' => [
            ['key' => 'id', 'title' => 'ID', 'type' => 'int'],
            ['key' => 'name', 'title' => 'Nome'],
            ['key' => 'email', 'title' => 'E-mail'],
            ['key' => 'cpf', 'title' => 'CPF'],
            ['key' => 'institution', 'title' => 'Instituição'],
            ['key' => 'school', 'title' => 'Escola'],
            ['key' => 'participant_type', 'title' => 'Tipo'],
            ['key' => 'lote', 'title' => 'Lote'],
            ['key' => 'status', 'title' => 'Status'],
            ['key' => 'payment_status', 'title' => 'Pagamento'],
            ['key' => 'lote_index', 'title' => 'Nº no lote', 'type' => 'int'],
            ['key' => 'came_from_presave', 'title' => 'Veio do pré-save'],
            ['key' => 'paid_amount', 'title' => 'Valor pago', 'type' => 'money'],
            ['key' => 'registered_at', 'title' => 'Inscrito em', 'type' => 'datetime'],
            ['key' => 'confirmed_at', 'title' => 'Confirmado em', 'type' => 'datetime'],
        ],
        'rows'    => $out,
        'summary' => [
            ['label' => 'Inscritos', 'value' => count($out), 'type' => 'int'],
            ['label' => 'Confirmados', 'value' => $byStatus['confirmed'] ?? 0, 'type' => 'int'],
            ['label' => 'Pendentes', 'value' => $byStatus['pending'] ?? 0, 'type' => 'int'],
            ['label' => 'Cancelados', 'value' => $byStatus['cancelled'] ?? 0, 'type' => 'int'],
            ['label' => 'Total arrecadado', 'value' => $totalPaid, 'type' => 'money'],
        ],
        'truncated' => $truncated,
    ];
}

function reportLotes(PDO $pdo): array
{
    $where = [];
    $params = [];
    reportIn('l.participant_type', reportList('participant_type', array_keys(REPORT_USER_TYPES)), 'ptype', $where, $params);
    reportIn('l.institution', reportList('institution'), 'inst', $where, $params);
    if (($v = reportBool('is_active')) !== null) { $where[] = 'l.is_active = ' . ($v ? 'true' : 'false'); }
    reportDateRange('l.starts_at', $where, $params, 'start');
    reportSearch(['l.name'], $where, $params);

    [$rows, $truncated] = reportFetch($pdo,
        'SELECT l.id, l.name, l.institution, l.participant_type, l.price, l.capacity, l.is_active,
                l.starts_at, l.ends_at,
                count(r.id) FILTER (WHERE r.status <> \'cancelled\') AS registered,
                count(r.id) FILTER (WHERE r.payment_status = \'paid\') AS paid,
                count(r.id) FILTER (WHERE r.status <> \'cancelled\' AND r.payment_status IN (\'unpaid\', \'awaiting_confirmation\')) AS pending,
                COALESCE(SUM(pay.total), 0) AS revenue
         FROM lotes l
         LEFT JOIN registrations r ON r.lote_id = l.id
         LEFT JOIN LATERAL (
             SELECT SUM(p.amount) AS total FROM payments p
             WHERE p.registration_id = r.id AND p.status = \'paid\'
         ) pay ON true'
        . reportWhere($where) . ' GROUP BY l.id ORDER BY l.order_index, l.id', $params);

    $totals = ['registered' => 0, 'paid' => 0, 'revenue' => 0.0, 'capacity' => 0];
    $out = [];
    foreach ($rows as $r) {
        $capacity = (int) $r['capacity'];
        $registered = (int) $r['registered'];
        $totals['registered'] += $registered;
        $totals['paid'] += (int) $r['paid'];
        $totals['revenue'] += (float) $r['revenue'];
        $totals['capacity'] += $capacity;
        $out[] = [
            'id'               => (int) $r['id'],
            'name'             => $r['name'],
            'institution'      => $r['institution'] !== null ? reportInstitution($r['institution']) : 'Qualquer',
            'participant_type' => REPORT_USER_TYPES[$r['participant_type']] ?? '',
            'price'            => (float) $r['price'],
            'capacity'         => $capacity,
            'registered'       => $registered,
            'paid'             => (int) $r['paid'],
            'pending'          => (int) $r['pending'],
            'remaining'        => max(0, $capacity - $registered),
            'revenue'          => (float) $r['revenue'],
            'is_active'        => reportYesNo($r['is_active']),
            'starts_at'        => $r['starts_at'],
            'ends_at'          => $r['ends_at'],
        ];
    }

    return [
        'title'   => 'Relatório de lotes',
        'columns' => [
            ['key' => 'id', 'title' => 'ID', 'type' => 'int'],
            ['key' => 'name', 'title' => 'Lote'],
            ['key' => 'institution', 'title' => 'Instituição'],
            ['key' => 'participant_type', 'title' => 'Tipo'],
            ['key' => 'price', 'title' => 'Preço', 'type' => 'money'],
            ['key' => 'capacity', 'title' => 'Vagas', 'type' => 'int'],
            ['key' => 'registered', 'title' => 'Inscritos', 'type' => 'int'],
            ['key' => 'paid', 'title' => 'Pagos', 'type' => 'int'],
            ['key' => 'pending', 'title' => 'Aguardando pagamento', 'type' => 'int'],
            ['key' => 'remaining', 'title' => 'Vagas restantes', 'type' => 'int'],
            ['key' => 'revenue', 'title' => 'Arrecadado', 'type' => 'money'],
            ['key' => 'is_active', 'title' => 'Ativo'],
            ['key' => 'starts_at', 'title' => 'Início', 'type' => 'datetime'],
            ['key' => 'ends_at', 'title' => 'Término', 'type' => 'datetime'],
        ],
        'rows'    => $out,
        'summary' => [
            ['label' => 'Lotes', 'value' => count($out), 'type' => 'int'],
            ['label' => 'Vagas', 'value' => $totals['capacity'], 'type' => 'int'],
            ['label' => 'Inscritos', 'value' => $totals['registered'], 'type' => 'int'],
            ['label' => 'Pagos', 'value' => $totals['paid'], 'type' => 'int'],
            ['label' => 'Arrecadado', 'value' => $totals['revenue'], 'type' => 'money'],
        ],
        'truncated' => $truncated,
    ];
}

function reportUsers(PDO $pdo): array
{
    $where = [];
    $params = [];
    reportIn('u.participant_type', reportList('participant_type', array_keys(REPORT_USER_TYPES)), 'ptype', $where, $params);
    reportIn('u.institution', reportList('institution'), 'inst', $where, $params);
    if (($v = reportText('school')) !== null) { $where[] = 'u.school ILIKE :school'; $params[':school'] = '%' . addcslashes($v, '%_\\') . '%'; }
    if (($v = reportBool('email_verified')) !== null) { $where[] = 'u.email_verified_at IS ' . ($v ? 'NOT NULL' : 'NULL'); }
    if (($v = reportBool('has_registration')) !== null) {
        $where[] = ($v ? '' : 'NOT ') . 'EXISTS (SELECT 1 FROM registrations rr WHERE rr.user_id = u.id)';
    }
    if (($perms = reportList('permission')) !== null) {
        $permWhere = [];
        reportIn('pp.slug', $perms, 'perm', $permWhere, $params);
        $where[] = 'EXISTS (SELECT 1 FROM user_permissions up JOIN permissions pp ON pp.id = up.permission_id
                            WHERE up.user_id = u.id AND ' . $permWhere[0] . ')';
    }
    reportDateRange('u.created_at', $where, $params, 'created');
    reportSearch(['u.name', 'u.email'], $where, $params);

    [$rows, $truncated] = reportFetch($pdo,
        'SELECT u.id, u.name, u.email, u.cpf, u.institution, u.school, u.participant_type, u.email_verified_at, u.created_at,
                (SELECT string_agg(pp.name, \', \' ORDER BY pp.name)
                 FROM user_permissions up JOIN permissions pp ON pp.id = up.permission_id
                 WHERE up.user_id = u.id) AS permissions,
                (SELECT r.status FROM registrations r WHERE r.user_id = u.id ORDER BY r.registered_at DESC LIMIT 1) AS reg_status
         FROM users u'
        . reportWhere($where) . ' ORDER BY u.created_at DESC', $params);

    $verified = 0;
    $registered = 0;
    $out = [];
    foreach ($rows as $r) {
        $verified += $r['email_verified_at'] !== null ? 1 : 0;
        $registered += $r['reg_status'] !== null ? 1 : 0;
        $out[] = [
            'id'               => (int) $r['id'],
            'name'             => $r['name'],
            'email'            => $r['email'],
            'cpf'              => reportMaskCpf((string) $r['cpf']),
            'institution'      => reportInstitution($r['institution']),
            'school'           => $r['school'] ?? '',
            'participant_type' => REPORT_USER_TYPES[$r['participant_type']] ?? '',
            'email_verified'   => reportYesNo($r['email_verified_at'] !== null),
            'permissions'      => $r['permissions'] ?? '',
            'reg_status'       => $r['reg_status'] !== null ? (REPORT_REG_STATUS[$r['reg_status']] ?? $r['reg_status']) : 'Sem inscrição',
            'created_at'       => $r['created_at'],
        ];
    }

    return [
        'title'   => 'Relatório de usuários',
        'columns' => [
            ['key' => 'id', 'title' => 'ID', 'type' => 'int'],
            ['key' => 'name', 'title' => 'Nome'],
            ['key' => 'email', 'title' => 'E-mail'],
            ['key' => 'cpf', 'title' => 'CPF'],
            ['key' => 'institution', 'title' => 'Instituição'],
            ['key' => 'school', 'title' => 'Escola'],
            ['key' => 'participant_type', 'title' => 'Tipo'],
            ['key' => 'email_verified', 'title' => 'E-mail verificado'],
            ['key' => 'permissions', 'title' => 'Permissões'],
            ['key' => 'reg_status', 'title' => 'Inscrição'],
            ['key' => 'created_at', 'title' => 'Cadastrado em', 'type' => 'datetime'],
        ],
        'rows'    => $out,
        'summary' => [
            ['label' => 'Usuários', 'value' => count($out), 'type' => 'int'],
            ['label' => 'E-mail verificado', 'value' => $verified, 'type' => 'int'],
            ['label' => 'Com inscrição', 'value' => $registered, 'type' => 'int'],
        ],
        'truncated' => $truncated,
    ];
}

function reportActivities(PDO $pdo): array
{
    $where = [];
    $params = [];
    reportIn('a.type', reportList('activity_type', array_keys(REPORT_ACT_TYPES)), 'type', $where, $params);
    if (($v = reportBool('is_published')) !== null) { $where[] = 'a.is_published = ' . ($v ? 'true' : 'false'); }
    if (($v = reportBool('early_access')) !== null) { $where[] = 'a.early_window_minutes IS ' . ($v ? 'NOT NULL' : 'NULL'); }
    reportDateRange('a.start_at', $where, $params, 'start');
    reportSearch(['a.title', 'a.speaker_name', 'a.location'], $where, $params);

    [$rows, $truncated] = reportFetch($pdo,
        'SELECT a.id, a.title, a.type, a.speaker_name, a.location, a.capacity, a.start_at, a.end_at,
                a.is_published, a.early_window_minutes,
                (SELECT count(*) FROM activity_enrollments e WHERE e.activity_id = a.id) AS enrolled,
                (SELECT count(*) FROM activity_attendance t WHERE t.activity_id = a.id) AS attended
         FROM activities a'
        . reportWhere($where) . ' ORDER BY a.start_at NULLS LAST, a.id', $params);

    $enrolled = 0;
    $attended = 0;
    $out = [];
    foreach ($rows as $r) {
        $e = (int) $r['enrolled'];
        $t = (int) $r['attended'];
        $enrolled += $e;
        $attended += $t;
        $cap = $r['capacity'] !== null ? (int) $r['capacity'] : null;
        $out[] = [
            'id'           => (int) $r['id'],
            'title'        => $r['title'],
            'type'         => REPORT_ACT_TYPES[$r['type']] ?? $r['type'],
            'speaker_name' => $r['speaker_name'] ?? '',
            'location'     => $r['location'] ?? '',
            'start_at'     => $r['start_at'],
            'end_at'       => $r['end_at'],
            'is_published' => reportYesNo($r['is_published']),
            'early_access' => reportYesNo($r['early_window_minutes'] !== null),
            'capacity'     => $cap,
            'enrolled'     => $e,
            'occupancy'    => $cap ? round($e / $cap * 100, 1) : null,
            'attended'     => $t,
            'attendance'   => $e > 0 ? round($t / $e * 100, 1) : null,
        ];
    }

    return [
        'title'   => 'Relatório de atividades',
        'columns' => [
            ['key' => 'id', 'title' => 'ID', 'type' => 'int'],
            ['key' => 'title', 'title' => 'Título'],
            ['key' => 'type', 'title' => 'Tipo'],
            ['key' => 'speaker_name', 'title' => 'Palestrante'],
            ['key' => 'location', 'title' => 'Local'],
            ['key' => 'start_at', 'title' => 'Início', 'type' => 'datetime'],
            ['key' => 'end_at', 'title' => 'Término', 'type' => 'datetime'],
            ['key' => 'is_published', 'title' => 'Publicada'],
            ['key' => 'early_access', 'title' => 'Acesso antecipado'],
            ['key' => 'capacity', 'title' => 'Vagas', 'type' => 'int'],
            ['key' => 'enrolled', 'title' => 'Inscritos', 'type' => 'int'],
            ['key' => 'occupancy', 'title' => 'Ocupação (%)', 'type' => 'percent'],
            ['key' => 'attended', 'title' => 'Presentes', 'type' => 'int'],
            ['key' => 'attendance', 'title' => 'Presença (%)', 'type' => 'percent'],
        ],
        'rows'    => $out,
        'summary' => [
            ['label' => 'Atividades', 'value' => count($out), 'type' => 'int'],
            ['label' => 'Inscrições', 'value' => $enrolled, 'type' => 'int'],
            ['label' => 'Presenças', 'value' => $attended, 'type' => 'int'],
            ['label' => 'Presença média (%)', 'value' => $enrolled > 0 ? round($attended / $enrolled * 100, 1) : 0, 'type' => 'percent'],
        ],
        'truncated' => $truncated,
    ];
}

/** Prestação de contas: livro-caixa unificado (inscrições pagas + receitas extras + despesas). */
function reportFinanceiro(PDO $pdo): array
{
    $kind     = reportEnum('kind', ['entrada', 'saida']);
    $category = reportText('category');
    $search   = reportText('q');

    $params = [];
    $dateWhere = function (string $column, string $prefix) use (&$params): string {
        $w = [];
        reportDateRange($column, $w, $params, $prefix);
        return $w ? ' AND ' . implode(' AND ', $w) : '';
    };

    $parts = [];
    if ($kind !== 'saida') {
        $parts[] = 'SELECT p.paid_at AS occurred_at, \'entrada\' AS kind, \'Inscrição\' AS origin, \'inscricoes\' AS category,
                           \'Inscrição de \' || u.name || COALESCE(\' — \' || l.name, \'\') AS description, p.amount
                    FROM payments p
                    JOIN registrations r ON r.id = p.registration_id
                    JOIN users u ON u.id = r.user_id
                    LEFT JOIN lotes l ON l.id = r.lote_id
                    WHERE p.status = \'paid\' AND p.paid_at IS NOT NULL' . $dateWhere('p.paid_at', 'pay');
        $parts[] = 'SELECT rv.received_at AS occurred_at, \'entrada\' AS kind, \'Receita extra\' AS origin, rv.category AS category, rv.description AS description, rv.amount AS amount
                    FROM revenues rv WHERE true' . $dateWhere('rv.received_at', 'rev');
    }
    if ($kind !== 'entrada') {
        $parts[] = 'SELECT ex.expense_date AS occurred_at, \'saida\' AS kind, \'Despesa\' AS origin, ex.category AS category, ex.description AS description, ex.amount AS amount
                    FROM expenses ex WHERE true' . $dateWhere('ex.expense_date', 'exp');
    }

    $outer = [];
    if ($category !== null) { $outer[] = 'category = :cat'; $params[':cat'] = $category; }
    if ($search !== null) {
        $outer[] = '(description ILIKE :q0 OR category ILIKE :q1)';
        $params[':q0'] = $params[':q1'] = '%' . addcslashes($search, '%_\\') . '%';
    }

    [$rows, $truncated] = reportFetch($pdo,
        'SELECT * FROM (' . implode(' UNION ALL ', $parts) . ') ledger'
        . reportWhere($outer) . ' ORDER BY occurred_at, description', $params);

    $entradas = 0.0;
    $saidas = 0.0;
    $byCategory = [];
    $balance = 0.0;
    $out = [];
    foreach ($rows as $r) {
        $amount = (float) $r['amount'];
        $isIn = $r['kind'] === 'entrada';
        if ($isIn) {
            $entradas += $amount;
        } else {
            $saidas += $amount;
        }
        $balance += $isIn ? $amount : -$amount;
        $byCategory[$r['kind'] . ':' . $r['category']] = ($byCategory[$r['kind'] . ':' . $r['category']] ?? 0.0) + $amount;
        $out[] = [
            'occurred_at' => $r['occurred_at'],
            'kind'        => $isIn ? 'Entrada' : 'Saída',
            'origin'      => $r['origin'],
            'category'    => $r['category'],
            'description' => $r['description'],
            'amount'      => $isIn ? $amount : -$amount,
            'balance'     => round($balance, 2),
        ];
    }

    $summary = [
        ['label' => 'Total de entradas', 'value' => $entradas, 'type' => 'money'],
        ['label' => 'Total de saídas', 'value' => $saidas, 'type' => 'money'],
        ['label' => 'Saldo', 'value' => $entradas - $saidas, 'type' => 'money'],
    ];
    ksort($byCategory);
    foreach ($byCategory as $key => $total) {
        [$k, $cat] = explode(':', $key, 2);
        $summary[] = ['label' => ($k === 'entrada' ? 'Entrada · ' : 'Saída · ') . $cat, 'value' => $total, 'type' => 'money'];
    }

    return [
        'title'   => 'Prestação de contas',
        'columns' => [
            ['key' => 'occurred_at', 'title' => 'Data', 'type' => 'datetime'],
            ['key' => 'kind', 'title' => 'Tipo'],
            ['key' => 'origin', 'title' => 'Origem'],
            ['key' => 'category', 'title' => 'Categoria'],
            ['key' => 'description', 'title' => 'Descrição'],
            ['key' => 'amount', 'title' => 'Valor', 'type' => 'money'],
            ['key' => 'balance', 'title' => 'Saldo acumulado', 'type' => 'money'],
        ],
        'rows'      => $out,
        'summary'   => $summary,
        'truncated' => $truncated,
    ];
}

// ─── Despacho ────────────────────────────────────────────────────────────────

$type = (string) ($_GET['report'] ?? '');

// Sem `report`: devolve só quais relatórios o usuário pode emitir.
if ($type === '') {
    requireAnyPermission(['super_admin', 'registration_admin', 'content_admin']);
    $mine = currentUserPermissions();
    $available = array_keys(array_filter(
        REPORT_PERMISSIONS,
        fn (array $slugs) => array_intersect($slugs, $mine) !== []
    ));
    jsonResponse(200, true, 'ok', ['available' => $available]);
}

if (!isset(REPORT_PERMISSIONS[$type])) {
    jsonResponse(422, false, 'Tipo de relatório inválido.');
}
requireAnyPermission(REPORT_PERMISSIONS[$type]);

try {
    $pdo = getDbConnection();
    $report = match ($type) {
        'registrations' => reportRegistrations($pdo),
        'lotes'         => reportLotes($pdo),
        'users'         => reportUsers($pdo),
        'activities'    => reportActivities($pdo),
        'financeiro'    => reportFinanceiro($pdo),
    };
    jsonResponse(200, true, 'ok', $report + ['generated_at' => date('c')]);
} catch (PDOException $e) {
    error_log('[TW26] admin/reports.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro ao gerar o relatório.');
}
