<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/certificate.php';

corsHeaders();
requireMethod('GET');

$user = requireLogin();

try {
    $attendance = calculateAttendanceHours((int) $user['id']);

    if ($attendance['total'] <= 0) {
        jsonResponse(404, false, 'Nenhuma presença registrada ainda — o certificado fica disponível assim que você confirmar presença em alguma atividade.');
    }

    $certificate = issueCertificate((int) $user['id'], $attendance['total']);

    $html = buildCertificateHtml(
        ['id' => (int) $user['id'], 'name' => $user['name']],
        $attendance,
        $certificate['code'],
        $certificate['issued_at']
    );

    $pdf = renderCertificatePdf($html);

    appLog('certificate.issued', ['user_id' => $user['id'], 'total_hours' => $attendance['total']]);

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="certificado-techweek2026.pdf"');
    header('Content-Length: ' . strlen($pdf));
    echo $pdf;
} catch (Exception $e) {
    error_log('[TW26] certificate.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao gerar o certificado.');
}
