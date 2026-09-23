<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../config/http.php';

// ─── parâmetros ───────────────────────────────────────────────────────────────

$code = strtoupper(trim($_GET['code'] ?? ''));

if ($code === '' || !preg_match('/^[0-9A-F]{16}$/', $code)) {
    renderPage('error', 'Código inválido', 'O código de verificação informado é inválido ou está mal formatado.');
    exit;
}

// ─── consulta no banco ────────────────────────────────────────────────────────

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
} catch (Exception $e) {
    renderPage('error', 'Erro interno', 'Não foi possível processar sua solicitação. Tente novamente mais tarde.');
    exit;
}

if (!$certificate) {
    renderPage('error', 'Certificado não encontrado', 'Este código de verificação não corresponde a nenhum certificado emitido.');
    exit;
}

$nameSafe   = htmlspecialchars($certificate['name'], ENT_QUOTES, 'UTF-8');
$hours      = rtrim(rtrim(number_format((float) $certificate['total_hours'], 1, ',', '.'), '0'), ',');
$hours      = $hours === '' ? '0' : $hours;
$issuedDate = (new DateTimeImmutable($certificate['issued_at']))->format('d/m/Y');

renderPage(
    'success',
    'Certificado autêntico',
    "Certificado emitido para <strong>{$nameSafe}</strong> — carga horária de <strong>{$hours}h</strong> — em {$issuedDate}.",
    true
);
exit;

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * @param 'success'|'error' $type
 */
function renderPage(string $type, string $title, string $message, bool $allowHtmlMessage = false): void
{
    $icon  = $type === 'success' ? '✅' : '❌';
    $color = $type === 'success' ? '#22c55e' : '#e94560';
    $titleH = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $msgH   = $allowHtmlMessage ? $message : htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $appUrl = 'https://techweekfb.com.br';

    echo <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$titleH} — TechWeek 2026</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: #0a0a0a;
      font-family: 'Segoe UI', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #111111;
      border-radius: 16px;
      padding: 56px 48px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,.6);
    }
    .icon   { font-size: 64px; margin-bottom: 24px; }
    .brand  { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 2px; margin-bottom: 32px; }
    .brand span { color: #8a00c4; }
    h1      { font-size: 24px; color: {$color}; margin-bottom: 16px; }
    p       { font-size: 15px; color: #aaa; line-height: 1.7; }
    .btn {
      display: inline-block;
      margin-top: 36px;
      padding: 14px 36px;
      background: #8a00c4;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 8px;
      letter-spacing: .5px;
      transition: opacity .2s;
    }
    .btn:hover { opacity: .85; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">{$icon}</div>
    <div class="brand">TECH<span>WEEK</span> 2026</div>
    <h1>{$titleH}</h1>
    <p>{$msgH}</p>
    <a href="{$appUrl}" class="btn">Ir para o site</a>
  </div>
</body>
</html>
HTML;
}
