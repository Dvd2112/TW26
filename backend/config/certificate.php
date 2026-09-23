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
 * @param array{id:int,name:string} $user
 * @param array{total: float, activities: list<array{title:string,type:string,date:?string,hours:float}>} $attendance
 */
function buildCertificateHtml(array $user, array $attendance, string $code, string $issuedAt): string
{
    $fontsDir = __DIR__ . '/../assets/certificate/fonts';
    $antonFont = _certificateAssetDataUri($fontsDir . '/Anton-Regular.ttf', 'font/ttf');
    $interFont = _certificateAssetDataUri($fontsDir . '/Inter_18pt-Regular.ttf', 'font/ttf');
    $logo      = _certificateAssetDataUri(__DIR__ . '/../assets/certificate/logo.png', 'image/png');

    $verifyUrl = rtrim(env('APP_URL', 'https://techweekfb.com.br'), '/') . '/TW26/backend/api/verify-certificate.php?code=' . $code;
    $qr        = _certificateQrDataUri($verifyUrl);

    $nameSafe    = htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8');
    $hoursLabel  = rtrim(rtrim(number_format($attendance['total'], 1, ',', '.'), '0'), ',');
    $hoursLabel  = $hoursLabel === '' ? '0' : $hoursLabel;
    $issuedLabel = (new DateTimeImmutable($issuedAt))->format('d/m/Y');
    $codeSafe    = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');

    $rows = '';
    foreach ($attendance['activities'] as $activity) {
        $titleSafe = htmlspecialchars($activity['title'], ENT_QUOTES, 'UTF-8');
        $typeSafe  = htmlspecialchars(_certificateActivityTypeLabel($activity['type']), ENT_QUOTES, 'UTF-8');
        $dateSafe  = htmlspecialchars($activity['date'] ?? '—', ENT_QUOTES, 'UTF-8');
        $hoursRow  = number_format($activity['hours'], 1, ',', '.');
        $rows .= <<<HTML
        <tr>
          <td class="cell cell-title">{$titleSafe}</td>
          <td class="cell">{$typeSafe}</td>
          <td class="cell">{$dateSafe}</td>
          <td class="cell cell-hours">{$hoursRow}h</td>
        </tr>
        HTML;
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4 landscape; }

  @font-face {
    font-family: 'Anton';
    src: url('{$antonFont}') format('truetype');
  }
  @font-face {
    font-family: 'Inter';
    src: url('{$interFont}') format('truetype');
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #ffffff; }

  .page {
    position: relative;
    width: 297mm;
    height: 210mm;
    background-color: #0d0016;
    background-image: linear-gradient(135deg, #04000a 0%, #140021 45%, #24003d 100%);
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .frame-outer {
    position: absolute;
    top: 12mm; left: 12mm; right: 12mm; bottom: 12mm;
    border: 1.4pt solid #8a00c4;
  }
  .frame-inner {
    position: absolute;
    top: 15mm; left: 15mm; right: 15mm; bottom: 15mm;
    border: 0.6pt solid #bf40ff;
  }

  .content {
    position: absolute;
    top: 22mm; left: 26mm; right: 26mm; bottom: 20mm;
    text-align: center;
  }

  .logo { height: 11mm; margin-bottom: 8mm; }

  .eyebrow {
    font-family: 'Inter', sans-serif;
    font-size: 11pt;
    letter-spacing: 4pt;
    text-transform: uppercase;
    color: #bf40ff;
    margin-bottom: 4mm;
  }
  .title {
    font-family: 'Anton', sans-serif;
    font-size: 40pt;
    letter-spacing: 3pt;
    color: #ffffff;
    margin-bottom: 10mm;
  }

  .granted-to {
    font-family: 'Inter', sans-serif;
    font-size: 11pt;
    color: #d9d9d9;
    letter-spacing: 1pt;
    margin-bottom: 4mm;
  }
  .name {
    font-family: 'Anton', sans-serif;
    font-size: 30pt;
    color: #ffffff;
    margin-bottom: 3mm;
  }
  .divider {
    width: 50mm;
    height: 1.2mm;
    background: linear-gradient(90deg, #8a00c4, #bf40ff);
    margin: 0 auto 10mm;
  }

  .description {
    font-family: 'Inter', sans-serif;
    font-size: 12pt;
    line-height: 1.7;
    color: #d9d9d9;
    max-width: 190mm;
    margin: 0 auto 10mm;
  }

  .hours-badge {
    display: inline-block;
    border: 1pt solid #8a00c4;
    padding: 5mm 14mm;
    margin-bottom: 4mm;
  }
  .hours-value {
    font-family: 'Anton', sans-serif;
    font-size: 22pt;
    color: #bf40ff;
  }
  .hours-caption {
    font-family: 'Inter', sans-serif;
    font-size: 9pt;
    letter-spacing: 2pt;
    text-transform: uppercase;
    color: #999999;
  }

  .footer {
    position: absolute;
    left: 26mm; right: 26mm; bottom: 18mm;
    display: table;
    width: calc(100% - 52mm);
  }
  .footer-cell { display: table-cell; vertical-align: middle; }
  .footer-left { text-align: left; font-size: 8.5pt; color: #888888; }
  .footer-right { text-align: right; }
  .footer-right .qr-box {
    display: inline-block;
    background: #ffffff;
    padding: 2mm;
  }
  .footer-right img { height: 18mm; display: block; }
  .footer-code { font-size: 8pt; color: #666666; letter-spacing: 1pt; margin-top: 1mm; }

  /* Página 2 — discriminação de atividades */
  .p2-header {
    position: absolute;
    top: 20mm; left: 26mm; right: 26mm;
    text-align: center;
  }
  .p2-eyebrow { font-size: 10pt; letter-spacing: 3pt; text-transform: uppercase; color: #bf40ff; margin-bottom: 3mm; }
  .p2-title { font-family: 'Anton', sans-serif; font-size: 22pt; color: #ffffff; margin-bottom: 2mm; }
  .p2-name { font-size: 11pt; color: #d9d9d9; }

  .table-wrap {
    position: absolute;
    top: 58mm; left: 26mm; right: 26mm; bottom: 26mm;
  }
  table.activities { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.activities thead th {
    text-align: left;
    font-family: 'Inter', sans-serif;
    font-size: 8.5pt;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    color: #bf40ff;
    padding: 3mm 3mm;
    border-bottom: 1pt solid #8a00c4;
  }
  table.activities .cell { padding: 3mm; border-bottom: 0.4pt solid #2a1440; color: #e6e6e6; }
  table.activities tr:nth-child(even) .cell { background: #12001f; }
  .cell-title { color: #ffffff; }
  .cell-hours { text-align: right; color: #bf40ff; font-weight: bold; }
  th.th-hours { text-align: right; }

  .total-row td { padding: 4mm 3mm 0; border-bottom: none; font-family: 'Anton', sans-serif; }
  .total-label { text-align: right; color: #d9d9d9; font-size: 10pt; }
  .total-value { text-align: right; color: #bf40ff; font-size: 14pt; }
</style>
</head>
<body>

  <!-- Página 1 — capa -->
  <div class="page">
    <div class="frame-outer"></div>
    <div class="frame-inner"></div>
    <div class="content">
      <img class="logo" src="{$logo}" alt="TechWeek 2026">
      <p class="eyebrow">Certificado de participação</p>
      <p class="title">TECHWEEK 2026</p>

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

    <div class="footer">
      <div class="footer-cell footer-left">
        Emitido em {$issuedLabel}<br>
        Código de verificação: {$codeSafe}
      </div>
      <div class="footer-cell footer-right">
        <div class="qr-box"><img src="{$qr}" alt="QR de verificação"></div>
      </div>
    </div>
  </div>

  <!-- Página 2 — atividades -->
  <div class="page">
    <div class="frame-outer"></div>
    <div class="frame-inner"></div>

    <div class="p2-header">
      <p class="p2-eyebrow">Carga horária detalhada</p>
      <p class="p2-title">ATIVIDADES CURSADAS</p>
      <p class="p2-name">{$nameSafe}</p>
    </div>

    <div class="table-wrap">
      <table class="activities">
        <thead>
          <tr>
            <th>Atividade</th>
            <th>Tipo</th>
            <th>Data</th>
            <th class="th-hours">Horas</th>
          </tr>
        </thead>
        <tbody>
          {$rows}
          <tr class="total-row">
            <td colspan="3" class="total-label">Total</td>
            <td class="total-value">{$hoursLabel}h</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div class="footer-cell footer-left">
        Emitido em {$issuedLabel}<br>
        Código de verificação: {$codeSafe}
      </div>
      <div class="footer-cell footer-right">
        <div class="qr-box"><img src="{$qr}" alt="QR de verificação"></div>
      </div>
    </div>
  </div>

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
