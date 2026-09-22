<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

if (!function_exists('normalizeAttendanceCode')):
/**
 * Normaliza um código digitado/escaneado: só alfanuméricos, em maiúsculas.
 * Deixa o usuário digitar com espaço, hífen ou minúscula sem quebrar a comparação.
 */
function normalizeAttendanceCode(mixed $value): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $value) ?? '');
}
endif;

if (!function_exists('generateAttendanceCode')):
/**
 * Gera um código hexadecimal em maiúsculas com $bytes * 2 caracteres.
 * Mesmo formato dos DEFAULTs da migração 012 (users.checkin_code = 8,
 * activities.attendance_code = 6).
 */
function generateAttendanceCode(int $bytes = 3): string
{
    return strtoupper(bin2hex(random_bytes(max(1, $bytes))));
}
endif;

if (!function_exists('recordAttendance')):
/**
 * Registra a presença do usuário na atividade.
 *
 * ON CONFLICT DO NOTHING deixa a operação idempotente e imune à corrida entre
 * dois credenciadores lendo o mesmo QR ao mesmo tempo.
 *
 * @param string $method 'scan' | 'manual' | 'self'
 * @return bool true se inseriu agora, false se já existia presença.
 */
function recordAttendance(
    PDO $pdo,
    int $userId,
    int $activityId,
    string $method,
    ?int $checkedInBy = null
): bool {
    $stmt = $pdo->prepare(
        'INSERT INTO activity_attendance (user_id, activity_id, method, checked_in_by)
         VALUES (:uid, :aid, :method, :by)
         ON CONFLICT (user_id, activity_id) DO NOTHING'
    );
    $stmt->execute([
        ':uid'    => $userId,
        ':aid'    => $activityId,
        ':method' => $method,
        ':by'     => $checkedInBy,
    ]);

    return $stmt->rowCount() > 0;
}
endif;

if (!function_exists('credentialerActivityIds')):
/**
 * Atividades que este usuário pode credenciar.
 *
 * Retorna null quando não há restrição (super_admin credencia qualquer
 * atividade). Para o credenciador comum retorna a lista designada em
 * activity_credentialers — lista vazia significa que ele não credencia nada
 * (default deny), nunca "tudo".
 *
 * @param list<string> $perms slugs de permissão do usuário
 * @return list<int>|null
 */
function credentialerActivityIds(PDO $pdo, int $userId, array $perms): ?array
{
    if (in_array('super_admin', $perms, true)) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT activity_id FROM activity_credentialers WHERE user_id = :uid'
    );
    $stmt->execute([':uid' => $userId]);

    return array_map('intval', array_column($stmt->fetchAll(), 'activity_id'));
}
endif;

if (!function_exists('canCredentialActivity')):
/**
 * @param list<int>|null $scope resultado de credentialerActivityIds()
 */
function canCredentialActivity(?array $scope, int $activityId): bool
{
    return $scope === null || in_array($activityId, $scope, true);
}
endif;
