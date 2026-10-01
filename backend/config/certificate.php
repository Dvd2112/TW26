<?php
declare(strict_types=1);

use Dompdf\Dompdf;
use Dompdf\Options as DompdfOptions;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QROutputInterface;

require_once __DIR__ . '/database.php';

if (!function_exists('calculateAttendanceHours')):
/**
 * Soma a carga horária das atividades em que o usuário confirmou presença,
 * derivada de activities.start_at/end_at (não há coluna dedicada de horas).
 *
 * @return array{total: float, activities: list<array{title:string,type:string,date:?string,hours:float}>}
 */
function calculateAttendanceHours(int $userId): array
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT a.title, a.type, a.start_at, a.end_at
         FROM activity_attendance att
         JOIN activities a ON a.id = att.activity_id
         WHERE att.user_id = :uid
         ORDER BY a.start_at ASC NULLS LAST, a.title ASC'
    );
    $stmt->execute([':uid' => $userId]);
    $rows = $stmt->fetchAll();

    $activities = [];
    $total = 0.0;

    foreach ($rows as $row) {
        $hours = 0.0;
        if ($row['start_at'] !== null && $row['end_at'] !== null) {
            $start = new DateTimeImmutable($row['start_at']);
            $end   = new DateTimeImmutable($row['end_at']);
            $hours = max(0, ($end->getTimestamp() - $start->getTimestamp()) / 3600);
        }

        $activities[] = [
            'title' => $row['title'],
            'type'  => $row['type'],
            'date'  => $row['start_at'] !== null ? (new DateTimeImmutable($row['start_at']))->format('d/m/Y') : null,
            'hours' => round($hours, 1),
        ];
        $total += $hours;
    }

    return ['total' => round($total, 1), 'activities' => $activities];
}
endif;

if (!function_exists('generateCertificateCode')):
function generateCertificateCode(): string
{
    return strtoupper(bin2hex(random_bytes(8)));
}
endif;

if (!function_exists('issueCertificate')):
/**
 * Cria (ou reemite, se já existir) o registro de certificado do usuário e
 * retorna seus dados — usado tanto pela geração do PDF quanto pela verificação.
 *
 * @return array{code:string,total_hours:float,issued_at:string}
 */
function issueCertificate(int $userId, float $totalHours): array
{
    $pdo = getDbConnection();

    $existing = $pdo->prepare('SELECT code, total_hours, issued_at FROM certificates WHERE user_id = :uid');
    $existing->execute([':uid' => $userId]);
    $row = $existing->fetch();

    if ($row !== false) {
        $update = $pdo->prepare(
            'UPDATE certificates SET total_hours = :hours, issued_at = NOW() WHERE user_id = :uid
             RETURNING code, total_hours, issued_at'
        );
        $update->execute([':hours' => $totalHours, ':uid' => $userId]);
        $row = $update->fetch();
    } else {
        $code = generateCertificateCode();
        $insert = $pdo->prepare(
            'INSERT INTO certificates (user_id, code, total_hours) VALUES (:uid, :code, :hours)
             RETURNING code, total_hours, issued_at'
        );
        $insert->execute([':uid' => $userId, ':code' => $code, ':hours' => $totalHours]);
        $row = $insert->fetch();
    }

    return [
        'code'        => $row['code'],
        'total_hours' => (float) $row['total_hours'],
        'issued_at'   => $row['issued_at'],
    ];
}
endif;

if (!function_exists('_certificateRequireVendor')):
function _certificateRequireVendor(): void
{
    $vendorAutoload = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($vendorAutoload)) {
        throw new RuntimeException(
            'Dependências do backend não instaladas. Rode "composer install" dentro de backend/.'
        );
    }
    require_once $vendorAutoload;
}
endif;

if (!function_exists('_certificateAssetDataUri')):
function _certificateAssetDataUri(string $path, string $mime): string
{
    $bytes = file_get_contents($path);
    return 'data:' . $mime . ';base64,' . base64_encode($bytes);
}
endif;

if (!function_exists('_certificateQrDataUri')):
function _certificateQrDataUri(string $url): string
{
    _certificateRequireVendor();

    $options = new QROptions([
        'outputType'  => QROutputInterface::GDIMAGE_PNG,
        'imageBase64' => true,
        'scale'       => 6,
        'addQuietzone' => true,
    ]);

    return (new QRCode($options))->render($url);
}
endif;

if (!function_exists('_certificateActivityTypeLabel')):
function _certificateActivityTypeLabel(string $type): string
{
    return match ($type) {
        'palestra' => 'Palestra',
        'workshop' => 'Workshop',
        'oficina'  => 'Oficina',
        default    => ucfirst($type),
    };
}
endif;

if (!function_exists('buildCertificateHtml')):
/**
 * O fundo (moldura, logo, assinaturas e logos dos parceiros) vem pronto em
 * assets/certificate/background.jpg (rasterizado do SVG de arte); aqui só entra o texto dinâmico.
 * Áreas livres no A4 paisagem: de ~50mm a ~150mm de altura.
 *
 * @param array{id:int,name:string} $user
 * @param array{total: float, activities: list<array{title:string,type:string,date:?string,hours:float}>} $attendance
 */
function buildCertificateHtml(array $user, array $attendance, string $code, string $issuedAt): string
{
    $fontsDir  = __DIR__ . '/../assets/certificate/fonts';
    $antonFont = _certificateAssetDataUri($fontsDir . '/Anton-Regular.ttf', 'font/ttf');
    $interFont = _certificateAssetDataUri($fontsDir . '/Inter_18pt-Regular.ttf', 'font/ttf');
    $background = _certificateAssetDataUri(__DIR__ . '/../assets/certificate/background.jpg', 'image/jpeg');

    $verifyUrl = rtrim(env('APP_URL', 'https://techweekfb.com.br'), '/') . '/TW26/backend/api/verify-certificate.php?code=' . $code;
    $qr        = _certificateQrDataUri($verifyUrl);

    $nameSafe    = htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8');
    $hoursLabel  = rtrim(rtrim(number_format($attendance['total'], 1, ',', '.'), '0'), ',');
    $hoursLabel  = $hoursLabel === '' ? '0' : $hoursLabel;
    $issuedLabel = (new DateTimeImmutable($issuedAt))->format('d/m/Y');
    $codeSafe    = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');

    $verifyBlock = <<<HTML
    <div class="verify">
      <div class="qr-box"><img src="{$qr}" alt="QR de verificação"></div>
      <p class="verify-text">Emitido em {$issuedLabel}<br>Código: {$codeSafe}</p>
    </div>
HTML;

    $chunks     = array_chunk($attendance['activities'], 6);
    $lastChunk  = count($chunks) - 1;
    $tablePages = '';
    foreach ($chunks as $index => $chunk) {
        $rows = '';
        foreach ($chunk as $activity) {
            $titleSafe = htmlspecialchars($activity['title'], ENT_QUOTES, 'UTF-8');
            $typeSafe  = htmlspecialchars(_certificateActivityTypeLabel($activity['type']), ENT_QUOTES, 'UTF-8');
            $dateSafe  = htmlspecialchars($activity['date'] ?? '—', ENT_QUOTES, 'UTF-8');
            $hoursRow  = number_format($activity['hours'], 1, ',', '.');
            $rows .= "<tr><td class=\"cell cell-title\">{$titleSafe}</td><td class=\"cell\">{$typeSafe}</td>"
                   . "<td class=\"cell\">{$dateSafe}</td><td class=\"cell cell-hours\">{$hoursRow}h</td></tr>";
        }

        $totalRow = $index === $lastChunk
            ? "<tr class=\"total-row\"><td colspan=\"3\" class=\"total-label\">Total</td><td class=\"total-value\">{$hoursLabel}h</td></tr>"
            : '';

        $tablePages .= <<<HTML
  <div class="page">
    <div class="p2-header">
      <p class="p2-title">ATIVIDADES CURSADAS</p>
      <p class="p2-name">{$nameSafe}</p>
    </div>
    <div class="table-wrap">
      <table class="activities">
        <thead>
          <tr><th>Atividade</th><th>Tipo</th><th>Data</th><th class="th-hours">Horas</th></tr>
        </thead>
        <tbody>{$rows}{$totalRow}</tbody>
      </table>
    </div>
    {$verifyBlock}
  </div>
HTML;
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4 landscape; }

  @font-face { font-family: 'Anton'; src: url('{$antonFont}') format('truetype'); }
  @font-face { font-family: 'Inter'; src: url('{$interFont}') format('truetype'); }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #231f20; }

  .page {
    position: relative;
    width: 297mm;
    height: 210mm;
    background-color: #f7f7f7;
    background-image: url('{$background}');
    background-size: 297mm 210mm;
    background-repeat: no-repeat;
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .eyebrow {
    font-size: 10pt;
    letter-spacing: 4pt;
    text-transform: uppercase;
    color: #8a00c4;
  }

  /* Página 1 */
  .content {
    position: absolute;
    top: 51mm; left: 45mm; right: 45mm;
    text-align: center;
  }
  .granted-to { font-size: 10.5pt; color: #444444; letter-spacing: 1pt; margin-top: 4mm; margin-bottom: 1mm; }
  .name { font-family: 'Anton', sans-serif; font-size: 28pt; color: #231f20; margin-bottom: 2mm; }
  .divider { width: 50mm; height: 1.2mm; background-color: #bf40ff; margin: 0 auto 4mm; }
  .description { font-size: 11pt; line-height: 1.4; color: #333333; margin: 0 auto 4mm; max-width: 180mm; }
  .hours-badge { display: inline-block; border: 1.2pt solid #8a00c4; padding: 1.5mm 10mm; }
  .hours-value { font-family: 'Anton', sans-serif; font-size: 18pt; color: #8a00c4; }
  .hours-caption { font-size: 7.5pt; letter-spacing: 2pt; text-transform: uppercase; color: #555555; }

  /* QR + código de verificação */
  .verify {
    position: absolute; bottom: 7mm; right: 9mm; text-align: center;
    background-color: #ffffff; padding: 1.5mm 2mm; border: 0.5pt solid #d9c2e8;
  }
  .qr-box { display: inline-block; }
  .qr-box img { height: 17mm; display: block; }
  .verify-text { font-size: 6pt; color: #333333; margin-top: 1mm; line-height: 1.4; }

  /* Páginas de atividades */
  .p2-header { position: absolute; top: 49mm; left: 45mm; right: 45mm; text-align: center; }
  .p2-title { font-family: 'Anton', sans-serif; font-size: 18pt; color: #231f20; margin-bottom: 1mm; }
  .p2-name { font-size: 9.5pt; color: #444444; }

  .table-wrap { position: absolute; top: 72mm; left: 45mm; right: 45mm; }
  table.activities { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  table.activities thead th {
    text-align: left;
    font-size: 8pt;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    color: #8a00c4;
    padding: 2mm 3mm;
    border-bottom: 1.2pt solid #8a00c4;
  }
  table.activities .cell { padding: 1.8mm 3mm; border-bottom: 0.4pt solid #d9c2e8; color: #231f20; }
  .cell-title { font-weight: bold; }
  .cell-hours { text-align: right; color: #8a00c4; font-weight: bold; }
  table.activities thead th.th-hours { text-align: right; padding-right: 2.5mm; }

  .total-row td { padding: 3mm 3mm 0; border-bottom: none; font-family: 'Anton', sans-serif; }
  .total-label { text-align: right; color: #444444; font-size: 10pt; }
  .total-value { text-align: right; color: #8a00c4; font-size: 14pt; }
</style>
</head>
<body>

  <div class="page">
    <div class="content">
      <p class="eyebrow">Certificado de participação</p>
      <p class="granted-to">Certificamos que</p>
      <p class="name">{$nameSafe}</p>
      <div class="divider"></div>
      <p class="description">
        participou da TechWeek 2026 — Francisco Beltrão, PR — tendo comparecido às
        atividades registradas em seu credenciamento, conforme detalhado na página seguinte.
      </p>
      <div class="hours-badge">
        <p class="hours-value">{$hoursLabel}h</p>
        <p class="hours-caption">Carga horária total</p>
      </div>
    </div>
    {$verifyBlock}
  </div>

{$tablePages}

</body>
</html>
HTML;
}
endif;

if (!function_exists('renderCertificatePdf')):
function renderCertificatePdf(string $html): string
{
    _certificateRequireVendor();

    $options = new DompdfOptions();
    // Precisa estar habilitado para o dompdf conseguir resolver os @font-face
    // com src em data: URI (fontes locais embutidas em base64) — o HTML é
    // sempre gerado internamente por buildCertificateHtml(), nunca a partir
    // de entrada externa, então não há risco de SSRF aqui.
    $options->set('isRemoteEnabled', true);
    $options->set('defaultFont', 'Inter');

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'landscape');
    $dompdf->render();

    return $dompdf->output();
}
endif;
