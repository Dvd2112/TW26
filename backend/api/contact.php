<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// CORS — ajuste o domínio em produção
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost:5173',
    'https://techweek2026.com.br',
    'https://dvd2112.github.io',
];
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
    exit;
}

// Sanitização e audiência
$audience = htmlspecialchars(strip_tags(trim($data['audience'] ?? 'general')), ENT_QUOTES, 'UTF-8');

$allowedAudiences = ['general', 'speaker', 'participant', 'sponsor'];
if (!in_array($audience, $allowedAudiences, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Tipo de contato inválido.']);
    exit;
}

// Validação dos campos obrigatórios
$required = match ($audience) {
    'speaker' => ['name', 'email', 'phone', 'topic'],
    'participant' => ['name', 'email', 'phone', 'profile'],
    'sponsor' => ['name', 'company', 'email', 'phone', 'tier'],
    default => ['name', 'email', 'phone', 'interest'],
};

foreach ($required as $field) {
    if (empty(trim($data[$field] ?? ''))) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => "Campo obrigatório ausente: $field"]);
        exit;
    }
}

$name    = htmlspecialchars(strip_tags(trim($data['name'])), ENT_QUOTES, 'UTF-8');
$company = htmlspecialchars(strip_tags(trim($data['company'] ?? '')), ENT_QUOTES, 'UTF-8');
$email   = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
$phone   = htmlspecialchars(strip_tags(trim($data['phone'])), ENT_QUOTES, 'UTF-8');
$tier    = htmlspecialchars(strip_tags(trim($data['tier'] ?? '')), ENT_QUOTES, 'UTF-8');
$interest = htmlspecialchars(strip_tags(trim($data['interest'] ?? '')), ENT_QUOTES, 'UTF-8');
$topic = htmlspecialchars(strip_tags(trim($data['topic'] ?? '')), ENT_QUOTES, 'UTF-8');
$profile = htmlspecialchars(strip_tags(trim($data['profile'] ?? '')), ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars(strip_tags(trim($data['message'] ?? '')), ENT_QUOTES, 'UTF-8');

if (!$email) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'E-mail inválido.']);
    exit;
}

// Valores permitidos por audiência
$allowedTiers = ['diamante', 'ouro', 'prata', 'personalizada'];

if ($audience === 'sponsor' && !in_array($tier, $allowedTiers, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Cota inválida.']);
    exit;
}

$allowedInterests = ['palestrantes', 'participantes', 'projeto-completo'];
if ($audience === 'general' && !in_array($interest, $allowedInterests, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Interesse inválido.']);
    exit;
}

$allowedTopics = ['ia-produto', 'engenharia', 'games', 'esg', 'lideranca'];
if ($audience === 'speaker' && !in_array($topic, $allowedTopics, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Tema inválido.']);
    exit;
}

$allowedProfiles = ['estudante', 'profissional', 'lideranca', 'comunidade'];
if ($audience === 'participant' && !in_array($profile, $allowedProfiles, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Perfil inválido.']);
    exit;
}

// Montagem do e-mail
$to      = 'david.junior211204@gmail.com';

$subjectText = match ($audience) {
    'speaker' => "[TechWeek 2026] Interesse de palestrante — $name",
    'participant' => "[TechWeek 2026] Interesse de participante — $name",
    'sponsor' => "[TechWeek 2026] Novo contato de patrocínio — $name ($company)",
    default => "[TechWeek 2026] Novo contato geral — $name",
};

$subject = "=?UTF-8?B?" . base64_encode($subjectText) . "?=";

$body  = "Novo contato recebido via site TechWeek 2026\n\n";
$body .= "Audiência: $audience\n";
$body .= "Nome:    $name\n";
$body .= "E-mail:  $email\n";
$body .= "Telefone: $phone\n";
$body .= "Empresa / Instituição: $company\n";

if ($audience === 'general') {
    $body .= "Interesse: $interest\n";
}

if ($audience === 'speaker') {
    $body .= "Tema / Trilha: $topic\n";
}

if ($audience === 'participant') {
    $body .= "Perfil: $profile\n";
}

if ($audience === 'sponsor') {
    $body .= "Cota:    $tier\n";
}

$body .= "Mensagem:\n$message\n";

$headers  = "From: noreply@techweek2026.com.br\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Contato enviado com sucesso!']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha ao enviar e-mail. Tente novamente ou entre em contato diretamente.']);
}
