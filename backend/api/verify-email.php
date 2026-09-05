<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../config/http.php';

// ─── parâmetros ───────────────────────────────────────────────────────────────

$token = trim($_GET['token'] ?? '');

if ($token === '' || !preg_match('/^[0-9a-f]{64}$/', $token)) {
    renderPage('error', 'Link inválido', 'O link de verificação é inválido ou está mal formatado.');
    exit;
}

// ─── consulta no banco ────────────────────────────────────────────────────────

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        'SELECT id, name, email_verified_at, email_token_expires
         FROM users
         WHERE email_token = :token
         LIMIT 1'
    );
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch();

} catch (Exception $e) {
    renderPage('error', 'Erro interno', 'Não foi possível processar sua solicitação. Tente novamente mais tarde.');
    exit;
}

if (!$user) {
    renderPage('error', 'Link não encontrado', 'Este link de verificação não existe ou já foi utilizado.');
    exit;
}

if ($user['email_verified_at'] !== null) {
    renderPage('already', 'E-mail já confirmado', 'Seu e-mail já foi verificado anteriormente. Você pode entrar normalmente.');
    exit;
}

// Verifica expiração
$expires = $user['email_token_expires'] ? new DateTimeImmutable($user['email_token_expires']) : null;
if ($expires === null || $expires < new DateTimeImmutable('now')) {
    renderPage('expired', 'Link expirado', 'Este link de verificação expirou. Faça um novo cadastro ou contate o suporte.');
    exit;
}

// ─── confirma e-mail ──────────────────────────────────────────────────────────

try {
    $update = $pdo->prepare(
        'UPDATE users
         SET email_verified_at   = NOW(),
             email_token         = NULL,
             email_token_expires = NULL,
             updated_at          = NOW()
         WHERE id = :id'
    );
    $update->execute([':id' => $user['id']]);

} catch (Exception $e) {
    appLog('verify_email.db_error', ['user_id' => $user['id'], 'message' => $e->getMessage()]);
    renderPage('error', 'Erro interno', 'Não foi possível confirmar o e-mail. Tente novamente mais tarde.');
    exit;
}

appLog('verify_email.success', ['user_id' => $user['id']]);

renderPage('success', 'E-mail confirmado!', 'Sua inscrição na TechWeek 2026 está com o e-mail confirmado. A organização ainda revisará sua inscrição manualmente.');
exit;

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * @param 'success'|'error'|'expired'|'already' $type
 */
function renderPage(string $type, string $title, string $message): void
{
    $icons = [
        'success' => '✅',
        'already' => '✅',
        'error'   => '❌',
        'expired' => '⏰',
    ];
    $colors = [
        'success' => '#22c55e',
        'already' => '#22c55e',
        'error'   => '#e94560',
        'expired' => '#f59e0b',
    ];

    $icon    = $icons[$type]  ?? '❌';
    $color   = $colors[$type] ?? '#e94560';
    $appUrl  = 'https://techweek2026.com.br';
    $titleH  = htmlspecialchars($title,   ENT_QUOTES, 'UTF-8');
    $msgH    = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

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
    .brand span { color: #e94560; }
    h1      { font-size: 24px; color: {$color}; margin-bottom: 16px; }
    p       { font-size: 15px; color: #aaa; line-height: 1.7; }
    .btn {
      display: inline-block;
      margin-top: 36px;
      padding: 14px 36px;
      background: #e94560;
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
