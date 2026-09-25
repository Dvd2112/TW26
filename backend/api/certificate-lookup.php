<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';

corsHeaders();
requireMethod('GET');

$code = strtoupper(preg_replace('/[\s-]+/', '', (string) ($_GET['code'] ?? '')));

if (!preg_match('/^[0-9A-F]{16}$/', $code)) {
    jsonResponse(422, false, 'Código inválido. Ele tem 16 caracteres (números e letras de A a F).');
}

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        'SELECT c.total_hours, c.issued_at, u.name
         FROM certificates c
         JOIN users u ON u.id = c.user_id
         WHERE c.code = :code
         LIMIT 1'
    );
    $stmt->execute([':code' => $code]);
    $certificate = $stmt->fetch();

    if ($certificate === false) {
        jsonResponse(404, false, 'Nenhum certificado emitido com esse código.');
    }

    jsonResponse(200, true, 'Certificado autêntico.', [
        'certificate' => [
            'name'        => $certificate['name'],
            'total_hours' => (float) $certificate['total_hours'],
            'issued_at'   => $certificate['issued_at'],
        ],
    ]);
} catch (Exception $e) {
    error_log('[TW26] certificate-lookup.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao verificar o certificado.');
}
