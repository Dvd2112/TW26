<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailException;

require_once __DIR__ . '/../vendor/autoload.php';
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
 */
function createMailer(): PHPMailer
{
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

if (!function_exists('sendConfirmationEmail')):
/**
 * Envia e-mail de confirmação de cadastro com link de verificação.
 *
 * @param string $toEmail  E-mail do destinatário
 * @param string $toName   Nome do destinatário
 * @param string $token    Token de verificação (hex)
 * @throws MailException   Em caso de falha no envio
 */
function sendConfirmationEmail(string $toEmail, string $toName, string $token): void
{
    $appUrl  = rtrim(getEnv('APP_URL', 'https://techweek2026.com.br'), '/');
    $link    = $appUrl . '/backend/api/verify-email.php?token=' . urlencode($token);
    $expires = '24 horas';

    $html = buildConfirmationHtml($toName, $link, $expires);
    $text = buildConfirmationText($toName, $link, $expires);

    $mail = createMailer();
    $mail->addAddress($toEmail, $toName);
    $mail->Subject  = '[TechWeek 2026] Confirme seu e-mail';
    $mail->isHTML(true);
    $mail->Body     = $html;
    $mail->AltBody  = $text;
    $mail->send();
}
endif;

if (!function_exists('sendAdminNotification')):
/**
 * Envia notificação interna de nova pré-inscrição ao administrador.
 */
function sendAdminNotification(string $name, string $maskedCpf, string $email, string $institution): void
{
    $adminEmail = getEnv('ADMIN_EMAIL', 'david.junior211204@gmail.com');

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

// ─── templates ────────────────────────────────────────────────────────────────

if (!function_exists('buildConfirmationHtml')):
function buildConfirmationHtml(string $name, string $link, string $expires): string
{
    $nameSafe  = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $linkSafe  = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail — TechWeek 2026</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#111111;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.5);">

          <!-- header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
                        padding:40px 48px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                TECH<span style="color:#e94560;">WEEK</span> 2026
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:#8899aa;letter-spacing:4px;text-transform:uppercase;">
                Confirmação de E-mail
              </p>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:48px 48px 32px;">
              <p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#ffffff;">
                Olá, {$nameSafe}!
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">
                Obrigado por se pré-inscrever na <strong style="color:#ffffff;">TechWeek 2026</strong>.
                Para concluir o cadastro, confirme seu endereço de e-mail clicando no botão abaixo.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="border-radius:8px;background:#e94560;">
                    <a href="{$linkSafe}"
                       style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;
                              color:#ffffff;text-decoration:none;letter-spacing:.5px;">
                      Confirmar E-mail
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#666666;">
                Este link é válido por <strong style="color:#aaaaaa;">{$expires}</strong>.
                Se você não criou esta conta, ignore este e-mail.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#555555;word-break:break-all;">
                Ou cole este endereço no navegador:<br>
                <a href="{$linkSafe}" style="color:#e94560;">{$linkSafe}</a>
              </p>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #222222;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444444;">
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

if (!function_exists('buildConfirmationText')):
function buildConfirmationText(string $name, string $link, string $expires): string
{
    return "Olá, $name!\n\n"
         . "Obrigado por se pré-inscrever na TechWeek 2026.\n\n"
         . "Confirme seu e-mail acessando o link abaixo (válido por $expires):\n"
         . "$link\n\n"
         . "Se você não criou esta conta, ignore este e-mail.\n\n"
         . "Equipe TechWeek 2026\n";
}
endif;
