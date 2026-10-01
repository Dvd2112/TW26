<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

if (!function_exists('hackathonSettings')):
/**
 * Configuração única do hackathon (linha id = 1), com tipos já normalizados.
 */
function hackathonSettings(PDO $pdo): array
{
    $row = $pdo->query(
        'SELECT registrations_open, price, free_for_paid_participants, charge_others,
                max_teams, min_team_size, max_team_size, pix_link,
                (qr_code_path IS NOT NULL) AS has_qr
         FROM hackathon_settings WHERE id = 1'
    )->fetch();

    if ($row === false) {
        $pdo->exec('INSERT INTO hackathon_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
        return hackathonSettings($pdo);
    }

    return [
        'registrations_open'         => dbBool($row['registrations_open']),
        'price'                      => (float) $row['price'],
        'free_for_paid_participants' => dbBool($row['free_for_paid_participants']),
        'charge_others'              => dbBool($row['charge_others']),
        'max_teams'                  => $row['max_teams'] !== null ? (int) $row['max_teams'] : null,
        'min_team_size'              => (int) $row['min_team_size'],
        'max_team_size'              => (int) $row['max_team_size'],
        'pix_link'                   => $row['pix_link'],
        'has_qr'                     => dbBool($row['has_qr']),
    ];
}
endif;

if (!function_exists('hackathonPriceFor')):
/**
 * Quanto o usuário paga no hackathon:
 *  - já pagou a inscrição do evento → grátis se free_for_paid_participants;
 *  - não tem inscrição paga         → grátis se !charge_others;
 *  - senão o preço configurado.
 */
function hackathonPriceFor(PDO $pdo, int $userId, array $settings): float
{
    $stmt = $pdo->prepare(
        "SELECT 1 FROM registrations
         WHERE user_id = :uid AND status <> 'cancelled' AND payment_status = 'paid' LIMIT 1"
    );
    $stmt->execute([':uid' => $userId]);
    $paidEvent = $stmt->fetchColumn() !== false;

    if ($paidEvent) {
        return $settings['free_for_paid_participants'] ? 0.0 : $settings['price'];
    }
    return $settings['charge_others'] ? $settings['price'] : 0.0;
}
endif;

if (!function_exists('hackathonApplyPrice')):
/**
 * Fixa valor e situação de pagamento de um integrante que acabou de aceitar
 * (ou que ainda não pagou e teve a regra/preço alterada). Só mexe em quem está
 * 'unpaid' sem comprovante: quem já ficou isento, enviou comprovante ou pagou
 * não é reavaliado.
 */
function hackathonApplyPrice(PDO $pdo, int $memberId, int $userId, array $settings): void
{
    $price = hackathonPriceFor($pdo, $userId, $settings);
    $pdo->prepare(
        "UPDATE hackathon_members
            SET amount = :amount, payment_status = :status
          WHERE id = :id AND payment_status = 'unpaid' AND proof_path IS NULL"
    )->execute([
        ':amount' => sprintf('%.2f', $price),
        ':status' => $price > 0 ? 'unpaid' : 'free',
        ':id'     => $memberId,
    ]);
}
endif;

if (!function_exists('normalizeCpf')):
function normalizeCpf(string $cpf): string
{
    return preg_replace('/\D/', '', $cpf) ?? '';
}
endif;

if (!function_exists('hackathonTeamCount')):
function hackathonTeamCount(PDO $pdo): int
{
    return (int) $pdo->query('SELECT count(*) FROM hackathon_teams')->fetchColumn();
}
endif;
