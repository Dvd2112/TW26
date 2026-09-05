<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailException;

require_once __DIR__ . '/database.php'; // expõe _loadEnv()

if (!function_exists('createMailer')):
/**
 * Retorna uma instância de PHPMailer configurada via variáveis de ambiente.
 *
 * Variáveis obrigatórias no .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Variáveis opcionais:
 *   SMTP_SECURE   (tls | ssl | "")      padrão: tls
 *   MAIL_FROM     endereço remetente    padrão: noreply@techweek2026.com.br
 *   MAIL_FROM_NAME nome do remetente    padrão: TechWeek 2026
 *
 * @throws RuntimeException se o PHPMailer não estiver instalado (composer install)
 */
function createMailer(): PHPMailer
{
    // Carregado sob demanda (não no topo do arquivo) para que a ausência do
    // vendor/ vire uma Exception recuperável, e não um Fatal Error que
    // derrubaria a requisição inteira antes mesmo do try/catch de quem chamou.
    $vendorAutoload = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($vendorAutoload)) {
        throw new RuntimeException(
            'PHPMailer não está instalado. Rode "composer install" dentro de backend/.'
        );
    }
    require_once $vendorAutoload;

    $env = _loadEnv();

    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = $env['SMTP_HOST']   ?? '';
    $mail->Port       = (int) ($env['SMTP_PORT'] ?? 587);
    $mail->SMTPAuth   = true;
    $mail->Username   = $env['SMTP_USER']   ?? '';
    $mail->Password   = $env['SMTP_PASS']   ?? '';
    $mail->CharSet    = 'UTF-8';

    $secure = strtolower(trim($env['SMTP_SECURE'] ?? 'tls'));
    if ($secure === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMIME;
    } elseif ($secure === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    }

    $mail->setFrom(
        $env['MAIL_FROM']      ?? 'noreply@techweek2026.com.br',
        $env['MAIL_FROM_NAME'] ?? 'TechWeek 2026'
    );

    return $mail;
}
endif;

if (!function_exists('sendWelcomeEmail')):
/**
 * Envia e-mail de boas-vindas após o cadastro (sem link de confirmação —
 * a inscrição segue seu fluxo normal independente de verificação de e-mail).
 *
 * @throws MailException Em caso de falha no envio
 */
function sendWelcomeEmail(string $toEmail, string $toName): void
{
    $mail = createMailer();
    $mail->addAddress($toEmail, $toName);
    $mail->Subject = '[TechWeek 2026] Inscrição recebida — bem-vindo(a)!';
    $mail->isHTML(true);
    $mail->Body    = buildWelcomeHtml($toName);
    $mail->AltBody = buildWelcomeText($toName);
    $mail->send();
}
endif;

if (!function_exists('sendPaymentConfirmedEmail')):
/**
 * Envia e-mail confirmando que o pagamento foi validado e a inscrição está
 * garantida. Disparado quando um admin aprova o pagamento.
 *
 * @throws MailException Em caso de falha no envio
 */
function sendPaymentConfirmedEmail(string $toEmail, string $toName, string $loteName, string $amount): void
{
    $mail = createMailer();
    $mail->addAddress($toEmail, $toName);
    $mail->Subject = '[TechWeek 2026] Pagamento confirmado — vaga garantida!';
    $mail->isHTML(true);
    $mail->Body    = buildPaymentConfirmedHtml($toName, $loteName, $amount);
    $mail->AltBody = buildPaymentConfirmedText($toName, $loteName, $amount);
    $mail->send();
}
endif;

if (!function_exists('sendAdminNotification')):
/**
 * Envia notificação interna de nova pré-inscrição ao administrador.
 */
function sendAdminNotification(string $name, string $maskedCpf, string $email, string $institution): void
{
    $adminEmail = env('ADMIN_EMAIL', 'david.junior211204@gmail.com');

    $mail = createMailer();
    $mail->addAddress($adminEmail);
    $mail->Subject = '[TechWeek 2026] Nova pré-inscrição — ' . $name;
    $mail->isHTML(false);
    $mail->Body    = "Nova pré-inscrição recebida:\n\n"
                   . "Nome:        $name\n"
                   . "CPF:         $maskedCpf\n"
                   . "E-mail:      $email\n"
                   . "Instituição: $institution\n";
    $mail->send();
}
endif;

// ─── layout compartilhado (cores do software: preto + roxo) ───────────────────

if (!function_exists('buildEmailShell')):
/**
 * Envelope HTML comum a todos os e-mails — mesma paleta usada no site
 * (fundo preto, cards #0d0d0d/#111111, roxo #8a00c4/#bf40ff).
 */
function buildEmailShell(string $eyebrow, string $bodyHtml): string
{
    $eyebrowSafe = htmlspecialchars($eyebrow, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechWeek 2026</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#0d0d0d;border-radius:12px;overflow:hidden;border:1px solid #1a1a1a;">

          <!-- header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0033 0%,#3d0066 50%,#8a00c4 100%);
                        padding:40px 48px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                TECH<span style="color:#bf40ff;">WEEK</span> 2026
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:#d9d9d9;letter-spacing:4px;text-transform:uppercase;">
                {$eyebrowSafe}
              </p>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:48px 48px 32px;">
              {$bodyHtml}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                © 2026 TechWeek — Dois Vizinhos, PR · Este é um e-mail automático, não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}
endif;

// ─── boas-vindas ────────────────────────────────────────────────────────────────

if (!function_exists('buildWelcomeHtml')):
function buildWelcomeHtml(string $name): string
{
    $nameSafe = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $accountUrl = htmlspecialchars(
        rtrim(env('APP_URL', 'https://techweek2026.com.br'), '/') . '/?page=account',
        ENT_QUOTES,
        'UTF-8'
    );

    $body = <<<HTML
<p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#ffffff;">
  Olá, {$nameSafe}! 🎉
</p>
<p style="margin:0 0 16px;font-size:15px;color:#d9d9d9;line-height:1.7;">
  Sua inscrição na <strong style="color:#ffffff;">TechWeek 2026</strong> foi recebida com sucesso.
  Seja muito bem-vindo(a)!
</p>
<p style="margin:0 0 24px;font-size:15px;color:#d9d9d9;line-height:1.7;">
  Em breve você vai poder acompanhar sua inscrição, o status do pagamento e se inscrever
  nas oficinas direto na sua conta no site.
</p>

<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:8px;background:#8a00c4;">
      <a href="{$accountUrl}"
         style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;
                color:#ffffff;text-decoration:none;letter-spacing:.5px;">
        Ver minha conta
      </a>
    </td>
  </tr>
</table>

<p style="margin:0;font-size:13px;color:#666666;">
  Se você não fez esse cadastro, pode ignorar este e-mail.
</p>
HTML;

    return buildEmailShell('Inscrição recebida', $body);
}
endif;

if (!function_exists('buildWelcomeText')):
function buildWelcomeText(string $name): string
{
    return "Olá, $name!\n\n"
         . "Sua inscrição na TechWeek 2026 foi recebida com sucesso. Seja bem-vindo(a)!\n\n"
         . "Acompanhe sua inscrição, o status do pagamento e as oficinas na sua conta:\n"
         . "https://techweek2026.com.br/?page=account\n\n"
         . "Equipe TechWeek 2026\n";
}
endif;

// ─── pagamento confirmado ───────────────────────────────────────────────────────

if (!function_exists('buildPaymentConfirmedHtml')):
function buildPaymentConfirmedHtml(string $name, string $loteName, string $amount): string
{
    $nameSafe = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $loteSafe = htmlspecialchars($loteName, ENT_QUOTES, 'UTF-8');
    $amountSafe = htmlspecialchars($amount, ENT_QUOTES, 'UTF-8');
    $oficinasUrl = htmlspecialchars(
        rtrim(env('APP_URL', 'https://techweek2026.com.br'), '/') . '/?page=oficinas',
        ENT_QUOTES,
        'UTF-8'
    );

    $body = <<<HTML
<p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#ffffff;">
  Pagamento confirmado, {$nameSafe}! ✅
</p>
<p style="margin:0 0 24px;font-size:15px;color:#d9d9d9;line-height:1.7;">
  Recebemos e validamos seu pagamento. Sua vaga na <strong style="color:#ffffff;">TechWeek 2026</strong>
  está <strong style="color:#bf40ff;">garantida</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#111111;border:1px solid #1a1a1a;border-radius:8px;margin:0 0 24px;">
  <tr>
    <td style="padding:20px 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Lote</p>
      <p style="margin:0 0 16px;font-size:16px;color:#ffffff;font-weight:600;">{$loteSafe}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Valor pago</p>
      <p style="margin:0;font-size:16px;color:#ffffff;font-weight:600;">R$ {$amountSafe}</p>
    </td>
  </tr>
</table>

<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:8px;background:#8a00c4;">
      <a href="{$oficinasUrl}"
         style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;
                color:#ffffff;text-decoration:none;letter-spacing:.5px;">
        Escolher minhas oficinas
      </a>
    </td>
  </tr>
</table>

<p style="margin:0;font-size:13px;color:#666666;">
  Nos vemos na TechWeek 2026!
</p>
HTML;

    return buildEmailShell('Pagamento confirmado', $body);
}
endif;

if (!function_exists('buildPaymentConfirmedText')):
function buildPaymentConfirmedText(string $name, string $loteName, string $amount): string
{
    return "Pagamento confirmado, $name!\n\n"
         . "Recebemos e validamos seu pagamento. Sua vaga na TechWeek 2026 está garantida.\n\n"
         . "Lote: $loteName\n"
         . "Valor pago: R$ $amount\n\n"
         . "Escolha suas oficinas em: https://techweek2026.com.br/?page=oficinas\n\n"
         . "Nos vemos na TechWeek 2026!\n"
         . "Equipe TechWeek 2026\n";
}
endif;
