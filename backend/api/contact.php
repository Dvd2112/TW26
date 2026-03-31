<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// CORS — ajuste o domínio em produção
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['http://localhost:5173', 'https://techweek2026.com.br'];
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

// Validação dos campos obrigatórios
$required = ['name', 'company', 'email', 'phone', 'tier'];
foreach ($required as $field) {
    if (empty(trim($data[$field] ?? ''))) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => "Campo obrigatório ausente: $field"]);
        exit;
    }
}

// Sanitização
$name    = htmlspecialchars(strip_tags(trim($data['name'])), ENT_QUOTES, 'UTF-8');
$company = htmlspecialchars(strip_tags(trim($data['company'])), ENT_QUOTES, 'UTF-8');
$email   = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
$phone   = htmlspecialchars(strip_tags(trim($data['phone'])), ENT_QUOTES, 'UTF-8');
$tier    = htmlspecialchars(strip_tags(trim($data['tier'])), ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars(strip_tags(trim($data['message'] ?? '')), ENT_QUOTES, 'UTF-8');

if (!$email) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'E-mail inválido.']);
    exit;
}

// Tiers permitidos
$allowedTiers = ['diamante', 'ouro', 'prata', 'personalizada'];
if (!in_array($tier, $allowedTiers, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Cota inválida.']);
    exit;
}

// Montagem do e-mail
$to      = 'david.junior211204@gmail.com';
$subject = "=?UTF-8?B?" . base64_encode("[TechWeek 2026] Novo contato de patrocínio — $name ($company)") . "?=";

$body  = "Novo interesse de patrocínio recebido via site TechWeek 2026\n\n";
$body .= "Nome:    $name\n";
$body .= "Empresa: $company\n";
$body .= "E-mail:  $email\n";
$body .= "Telefone: $phone\n";
$body .= "Cota:    $tier\n";
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
