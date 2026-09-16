<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';

corsHeaders();
requireMethod('GET');

$user = requireLogin();

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        'SELECT r.id AS registration_id, r.status, r.payment_status, r.participant_type,
                r.registered_at, r.confirmed_at,
                l.id AS lote_id, l.name AS lote_name, l.price AS lote_price,
                p.id AS payment_id, p.amount, p.status AS payment_status,
                p.participant_confirmed_at, p.paid_at
         FROM registrations r
         LEFT JOIN lotes l ON l.id = r.lote_id
         LEFT JOIN payments p ON p.registration_id = r.id
         WHERE r.user_id = :uid
         ORDER BY p.id DESC
         LIMIT 1'
    );
    $stmt->execute([':uid' => $user['id']]);
    $row = $stmt->fetch();

    $registration = null;
    $payment      = null;
    if ($row !== false) {
        $registration = [
            'id'               => (int) $row['registration_id'],
            'status'           => $row['status'],
            'payment_status'   => $row['payment_status'],
            'participant_type' => $row['participant_type'],
            'registered_at'    => $row['registered_at'],
            'confirmed_at'     => $row['confirmed_at'],
            'lote'             => [
                'id'    => $row['lote_id'] !== null ? (int) $row['lote_id'] : null,
                'name'  => $row['lote_name'],
                'price' => $row['lote_price'] !== null ? (float) $row['lote_price'] : null,
            ],
        ];
        $payment = [
            'id'                     => $row['payment_id'] !== null ? (int) $row['payment_id'] : null,
            'amount'                 => $row['amount'] !== null ? (float) $row['amount'] : null,
            'status'                 => $row['payment_status'],
            'participant_confirmed_at' => $row['participant_confirmed_at'],
            'paid_at'                => $row['paid_at'],
        ];
    }

    jsonResponse(200, true, 'ok', [
        'user' => [
            'id'               => (int) $user['id'],
            'name'             => $user['name'],
            'email'            => $user['email'],
            'participant_type' => $user['participant_type'],
        ],
        'registration' => $registration,
        'payment'      => $payment,
        'pix'          => [
            'key'  => env('PIX_KEY', ''),
            'name' => env('PIX_NAME', ''),
            'city' => env('PIX_CITY', ''),
        ],
    ]);
} catch (Exception $e) {
    error_log('[TW26] my-registration.php: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao carregar sua inscrição.');
}