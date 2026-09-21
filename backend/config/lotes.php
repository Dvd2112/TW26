<?php
declare(strict_types=1);

// Tempo (minutos) que uma inscrição sem comprovante segura a vaga no lote.
if (!defined('LOTE_UNPAID_HOLD_MINUTES')) {
    define('LOTE_UNPAID_HOLD_MINUTES', 30);
}

if (!function_exists('loteOccupiesSlotSql')):
/**
 * Condição SQL (sobre a tabela registrations) das inscrições que ocupam vaga
 * no lote: não canceladas E (com comprovante enviado/pago OU inscritas há até
 * LOTE_UNPAID_HOLD_MINUTES). Inscrição pendente sem comprovante fora da janela
 * devolve a vaga automaticamente.
 */
function loteOccupiesSlotSql(string $alias = 'r'): string
{
    $minutes = (int) LOTE_UNPAID_HOLD_MINUTES;
    return "({$alias}.status <> 'cancelled' AND ("
        . "{$alias}.payment_status <> 'unpaid' "
        . "OR {$alias}.registered_at > NOW() - INTERVAL '{$minutes} minutes'))";
}
endif;

if (!function_exists('assignLoteIndex')):
/**
 * Atribui à inscrição o próximo índice (1, 2, 3...) do lote dela, se ainda não
 * tiver. Chamar SÓ quando o pagamento for confirmado e DENTRO de uma transação:
 * a linha do lote é travada (FOR UPDATE) para serializar a numeração.
 * Índices nunca são reaproveitados (inclusive de inscrições canceladas depois).
 *
 * @return int|null o índice da inscrição; null se ela não tem lote.
 */
function assignLoteIndex(PDO $pdo, int $registrationId): ?int
{
    $stmt = $pdo->prepare('SELECT lote_id, lote_index FROM registrations WHERE id = :id');
    $stmt->execute([':id' => $registrationId]);
    $reg = $stmt->fetch();

    if ($reg === false || $reg['lote_id'] === null) {
        return null;
    }
    if ($reg['lote_index'] !== null) {
        return (int) $reg['lote_index'];
    }

    $loteId = (int) $reg['lote_id'];
    $pdo->prepare('SELECT id FROM lotes WHERE id = :id FOR UPDATE')->execute([':id' => $loteId]);

    $upd = $pdo->prepare(
        'UPDATE registrations
            SET lote_index = (SELECT COALESCE(MAX(x.lote_index), 0) + 1
                                FROM registrations x WHERE x.lote_id = :lote)
          WHERE id = :id AND lote_index IS NULL
      RETURNING lote_index'
    );
    $upd->execute([':lote' => $loteId, ':id' => $registrationId]);
    $index = $upd->fetchColumn();

    return $index === false ? null : (int) $index;
}
endif;

if (!function_exists('loteFinalPrice')):
/**
 * Preço que o usuário efetivamente paga no lote, conforme o tipo dele:
 * staff = gratuito; voluntário = desconto do lote; normal = preço cheio.
 */
function loteFinalPrice(float $price, float $volunteerDiscountPercent, string $participantType): float
{
    if ($participantType === 'staff') {
        return 0.0;
    }
    if ($participantType === 'volunteer') {
        return round($price * (1 - $volunteerDiscountPercent / 100), 2);
    }
    return $price;
}
endif;
