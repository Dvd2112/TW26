<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';

corsHeaders();
requireCsrf();

$user = requireLogin();
$pdo  = getDbConnection();

const ALLOWED_ROLES         = ['credenciamento', 'montagem', 'hackathon'];
const ALLOWED_EVENT_DAYS    = ['19', '20', '21', '22'];
const ALLOWED_HACKATHON_DAYS = ['17', '18'];

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: candidatura do usuário logado + status do formulário ─────────── */
if ($method === 'GET') {
    try {
        $settings = $pdo->query('SELECT applications_open FROM volunteer_settings WHERE id = 1')->fetch();
        $open = $settings !== false ? dbBool($settings['applications_open']) : true;

        $stmt = $pdo->prepare(
            'SELECT phone, roles, event_days, hackathon_days, motivation, status, created_at
             FROM volunteer_applications WHERE user_id = :uid'
        );
        $stmt->execute([':uid' => $user['id']]);
        $application = $stmt->fetch();

        jsonResponse(200, true, 'ok', [
            'applications_open' => $open,
            'application'        => $application !== false ? $application : null,
        ]);
    } catch (Exception $e) {
        error_log('[TW26] volunteer.php GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar candidatura.');
    }
}

/* ─── POST: enviar candidatura ────────────────────────────────────────────── */
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, false, 'JSON inválido.');
    }

    $phone      = htmlspecialchars(strip_tags(trim((string) ($data['phone'] ?? ''))), ENT_QUOTES, 'UTF-8');
    $motivation = htmlspecialchars(strip_tags(trim((string) ($data['motivation'] ?? ''))), ENT_QUOTES, 'UTF-8');
    $roles      = is_array($data['roles'] ?? null) ? array_values(array_unique($data['roles'])) : [];
    $eventDays  = is_array($data['event_days'] ?? null) ? array_values(array_unique($data['event_days'])) : [];
    $hackDays   = is_array($data['hackathon_days'] ?? null) ? array_values(array_unique($data['hackathon_days'])) : [];

    if ($phone === '' || $motivation === '') {
        jsonResponse(422, false, 'Preencha o telefone e a motivação.');
    }

    if (mb_strlen($phone, 'UTF-8') < 8 || mb_strlen($phone, 'UTF-8') > 20) {
        jsonResponse(422, false, 'Telefone inválido.');
    }
    if (mb_strlen($motivation, 'UTF-8') < 2 || mb_strlen($motivation, 'UTF-8') > 1000) {
        jsonResponse(422, false, 'Motivação inválida.');
    }

    if (empty($roles) || count(array_diff($roles, ALLOWED_ROLES)) > 0) {
        jsonResponse(422, false, 'Selecione ao menos uma frente de trabalho válida.');
    }

    $wantsEvent = count(array_intersect($roles, ['credenciamento', 'montagem'])) > 0;
    $wantsHack  = in_array('hackathon', $roles, true);

    if ($wantsEvent && (empty($eventDays) || count(array_diff($eventDays, ALLOWED_EVENT_DAYS)) > 0)) {
        jsonResponse(422, false, 'Selecione os dias disponíveis no evento principal (19 a 22).');
    }
    if (!$wantsEvent) {
        $eventDays = [];
    }

    if ($wantsHack && (empty($hackDays) || count(array_diff($hackDays, ALLOWED_HACKATHON_DAYS)) > 0)) {
        jsonResponse(422, false, 'Selecione os dias disponíveis no hackathon (17 e 18).');
    }
    if (!$wantsHack) {
        $hackDays = [];
    }

    try {
        $settings = $pdo->query('SELECT applications_open FROM volunteer_settings WHERE id = 1')->fetch();
        $open = $settings !== false ? dbBool($settings['applications_open']) : true;
        if (!$open) {
            jsonResponse(409, false, 'As candidaturas a voluntário estão encerradas no momento.');
        }

        $check = $pdo->prepare('SELECT id FROM volunteer_applications WHERE user_id = :uid LIMIT 1');
        $check->execute([':uid' => $user['id']]);
        if ($check->fetch() !== false) {
            jsonResponse(409, false, 'Você já enviou uma candidatura a voluntário.');
        }

        $insert = $pdo->prepare(
            'INSERT INTO volunteer_applications (user_id, phone, roles, event_days, hackathon_days, motivation)
             VALUES (:uid, :phone, :roles, :event_days, :hackathon_days, :motivation)'
        );
        $insert->execute([
            ':uid'            => $user['id'],
            ':phone'          => $phone,
            ':roles'          => implode(',', $roles),
            ':event_days'     => implode(',', $eventDays),
            ':hackathon_days' => implode(',', $hackDays),
            ':motivation'     => $motivation,
        ]);
    } catch (Exception $e) {
        error_log('[TW26] volunteer.php POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao enviar candidatura.');
    }

    appLog('volunteer.application_submitted', ['user_id' => $user['id']]);

    jsonResponse(201, true, 'Candidatura enviada! Nossa equipe vai avaliar em breve.');
}

jsonResponse(405, false, 'Método não permitido.');
