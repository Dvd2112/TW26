<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

if (!function_exists('activityGeneralOpensAtSql')):
/**
 * Expressão SQL (sobre activities) do instante em que a atividade abre para
 * todos: published_at + early_window_minutes, quando há lotes de acesso
 * antecipado escolhidos; NULL = aberta assim que publicada.
 */
function activityGeneralOpensAtSql(string $activity = 'a'): string
{
    return "(CASE WHEN {$activity}.early_window_minutes IS NOT NULL
                   AND EXISTS (SELECT 1 FROM activity_early_lotes el WHERE el.activity_id = {$activity}.id)
              THEN {$activity}.published_at + {$activity}.early_window_minutes * INTERVAL '1 minute' END)";
}
endif;

if (!function_exists('userHasEarlyAccessSql')):
/**
 * Condição SQL: o usuário (placeholder :uid) tem inscrição paga e não cancelada
 * em algum lote de acesso antecipado da atividade.
 */
function userHasEarlyAccessSql(string $activity = 'a'): string
{
    return "EXISTS (SELECT 1 FROM activity_early_lotes el
                      JOIN registrations r ON r.lote_id = el.lote_id
                     WHERE el.activity_id = {$activity}.id AND r.user_id = :uid
                       AND r.status <> 'cancelled' AND r.payment_status = 'paid')";
}
endif;

if (!function_exists('parseEarlyAccess')):
/**
 * Lê lotes + antecedência do payload do admin.
 * @return array{lotes: int[], minutes: ?int}|string  string = mensagem de erro (422)
 */
function parseEarlyAccess(PDO $pdo, array $data): array|string
{
    $ids = array_values(array_unique(array_filter(
        array_map('intval', (array) ($data['early_lote_ids'] ?? [])),
        static fn(int $id): bool => $id > 0
    )));
    $minutes = ($data['early_window_minutes'] ?? '') !== '' && $data['early_window_minutes'] !== null
        ? (int) $data['early_window_minutes'] : null;

    if ($ids === []) {
        return ['lotes' => [], 'minutes' => null];
    }
    if ($minutes === null || $minutes <= 0 || $minutes > 525600) {
        return 'Informe a antecedência (horas e minutos) do acesso antecipado.';
    }

    $in = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT count(*) FROM lotes WHERE id IN ($in)");
    $stmt->execute($ids);
    if ((int) $stmt->fetchColumn() !== count($ids)) {
        return 'Lote de acesso antecipado inválido.';
    }
    return ['lotes' => $ids, 'minutes' => $minutes];
}
endif;

if (!function_exists('saveEarlyLotes')):
/** Substitui os lotes de acesso antecipado da atividade (chamar dentro de transação). */
function saveEarlyLotes(PDO $pdo, int $activityId, array $loteIds): void
{
    $pdo->prepare('DELETE FROM activity_early_lotes WHERE activity_id = :id')->execute([':id' => $activityId]);
    $ins = $pdo->prepare('INSERT INTO activity_early_lotes (activity_id, lote_id) VALUES (:a, :l)');
    foreach ($loteIds as $loteId) {
        $ins->execute([':a' => $activityId, ':l' => $loteId]);
    }
}
endif;
