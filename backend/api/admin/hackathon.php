<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/storage.php';
require_once __DIR__ . '/../../config/hackathon.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'registration_admin']);

const MAX_QR_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_QR_MIMES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

/** Remove o arquivo de QR do disco (o nome vem do banco, gerado pelo servidor). */
function deleteHackathonQrFile(?string $filename): void
{
    if ($filename === null || $filename === '') {
        return;
    }
    $path = storagePath('qrcodes/' . $filename);
    if (is_file($path)) {
        unlink($path);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: configuração + equipes com integrantes ────────────────────────── */
if ($method === 'GET') {
    try {
        $settings = hackathonSettings($pdo);

        $teams = $pdo->query(
            'SELECT t.id, t.name, t.created_at, u.name AS leader_name, u.email AS leader_email
             FROM hackathon_teams t JOIN users u ON u.id = t.created_by
             ORDER BY t.created_at DESC'
        )->fetchAll();

        $members = $pdo->query(
            'SELECT id, team_id, user_id, name, cpf, email, is_leader, invite_status, amount,
                    payment_status, (proof_path IS NOT NULL) AS has_proof, proof_uploaded_at, paid_at, confirmed_note
             FROM hackathon_members ORDER BY is_leader DESC, id ASC'
        )->fetchAll();

        $byTeam = [];
        foreach ($members as $m) {
            $byTeam[(int) $m['team_id']][] = [
                'id'                => (int) $m['id'],
                'name'              => $m['name'],
                'email'             => $m['email'],
                'cpf'               => substr($m['cpf'], 0, 3) . '.***.***-' . substr($m['cpf'], 9, 2),
                'is_leader'         => dbBool($m['is_leader']),
                'linked'            => $m['user_id'] !== null,
                'invite_status'     => $m['invite_status'],
                'amount'            => (float) $m['amount'],
                'payment_status'    => $m['payment_status'],
                'has_proof'         => dbBool($m['has_proof']),
                'proof_uploaded_at' => $m['proof_uploaded_at'],
                'paid_at'           => $m['paid_at'],
                'confirmed_note'    => $m['confirmed_note'],
            ];
        }

        foreach ($teams as &$team) {
            $team['id']      = (int) $team['id'];
            $team['members'] = $byTeam[$team['id']] ?? [];
        }
        unset($team);

        jsonResponse(200, true, 'ok', ['settings' => $settings, 'teams' => $teams]);
    } catch (Exception $e) {
        error_log('[TW26] admin/hackathon GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar o hackathon.');
    }
}

if ($method !== 'POST') {
    jsonResponse(405, false, 'Método não permitido.');
}

/* ─── POST (multipart): enviar/substituir o QR do PIX ────────────────────── */
if (isset($_FILES['qr'])) {
    $file = $_FILES['qr'];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        jsonResponse(422, false, 'Anexe a imagem do QR code.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(422, false, 'Falha no upload da imagem. Tente novamente.');
    }
    if ($file['size'] <= 0 || $file['size'] > MAX_QR_BYTES) {
        jsonResponse(422, false, 'A imagem do QR code deve ter no máximo 2MB.');
    }

    // Detecta o tipo real do arquivo (não confia na extensão nem no Content-Type do cliente)
    $detectedMime = mime_content_type($file['tmp_name']) ?: '';
    $extension    = ALLOWED_QR_MIMES[$detectedMime] ?? null;
    if ($extension === null || @getimagesize($file['tmp_name']) === false) {
        jsonResponse(422, false, 'Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
    }

    try {
        hackathonSettings($pdo); // garante a linha id = 1
        $old = $pdo->query('SELECT qr_code_path FROM hackathon_settings WHERE id = 1')->fetchColumn();

        $filename    = sprintf('hackathon_%s.%s', bin2hex(random_bytes(16)), $extension);
        $destination = storagePath('qrcodes/' . $filename);

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            appLog('hackathon.qr_upload_failed', ['admin_id' => $user['id']]);
            jsonResponse(500, false, 'Erro ao salvar a imagem. Tente novamente.');
        }

        $pdo->prepare('UPDATE hackathon_settings SET qr_code_path = :p, updated_at = NOW() WHERE id = 1')
            ->execute([':p' => $filename]);
        deleteHackathonQrFile($old !== false ? $old : null);

        jsonResponse(200, true, 'QR code salvo.');
    } catch (Exception $e) {
        error_log('[TW26] admin/hackathon QR: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao salvar o QR code.');
    }
}

/* ─── POST (JSON): ações ─────────────────────────────────────────────────── */
$data = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($data)) {
    jsonResponse(400, false, 'JSON inválido.');
}
$action = (string) ($data['action'] ?? '');

try {
    if ($action === 'set_settings') {
        $price = round((float) ($data['price'] ?? 0), 2);
        $min   = (int) ($data['min_team_size'] ?? 0);
        $max   = (int) ($data['max_team_size'] ?? 0);
        $teams = $data['max_teams'] ?? null;
        $teams = ($teams === null || $teams === '') ? null : (int) $teams;
        $link  = trim((string) ($data['pix_link'] ?? ''));

        if ($price < 0 || $price > 99999999) {
            jsonResponse(422, false, 'Preço inválido.');
        }
        if ($min < 1 || $max < $min || $max > 20) {
            jsonResponse(422, false, 'Tamanho de equipe inválido (mínimo ≥ 1 e máximo ≥ mínimo, até 20).');
        }
        if ($teams !== null && $teams < 1) {
            jsonResponse(422, false, 'O limite de equipes deve ser positivo (ou vazio para sem limite).');
        }
        if ($link !== '' && (!filter_var($link, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $link))) {
            jsonResponse(422, false, 'O link do PIX deve começar com http:// ou https://.');
        }

        hackathonSettings($pdo); // garante a linha id = 1
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'UPDATE hackathon_settings
             SET registrations_open = :open, price = :price,
                 free_for_paid_participants = :free_paid, charge_others = :charge,
                 max_teams = :teams, min_team_size = :min, max_team_size = :max,
                 pix_link = :link, updated_at = NOW()
             WHERE id = 1'
        );
        $stmt->bindValue(':open', !empty($data['registrations_open']), PDO::PARAM_BOOL);
        $stmt->bindValue(':price', sprintf('%.2f', $price));
        $stmt->bindValue(':free_paid', !empty($data['free_for_paid_participants']), PDO::PARAM_BOOL);
        $stmt->bindValue(':charge', !empty($data['charge_others']), PDO::PARAM_BOOL);
        $stmt->bindValue(':teams', $teams, $teams === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':min', $min, PDO::PARAM_INT);
        $stmt->bindValue(':max', $max, PDO::PARAM_INT);
        $stmt->bindValue(':link', $link !== '' ? $link : null, $link !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->execute();

        // Reaplica as regras a quem ainda não pagou (isenta/cobra conforme a nova configuração).
        $settings = hackathonSettings($pdo);
        $pending  = $pdo->query(
            "SELECT id, user_id FROM hackathon_members
             WHERE invite_status = 'accepted' AND user_id IS NOT NULL
               AND payment_status = 'unpaid' AND proof_path IS NULL"
        )->fetchAll();
        foreach ($pending as $row) {
            hackathonApplyPrice($pdo, (int) $row['id'], (int) $row['user_id'], $settings);
        }
        $pdo->commit();

        appLog('admin.hackathon_settings', ['admin_id' => $user['id']]);
        jsonResponse(200, true, 'Configurações do hackathon salvas.');
    }

    if ($action === 'delete_qr') {
        hackathonSettings($pdo);
        $old = $pdo->query('SELECT qr_code_path FROM hackathon_settings WHERE id = 1')->fetchColumn();
        $pdo->exec('UPDATE hackathon_settings SET qr_code_path = NULL, updated_at = NOW() WHERE id = 1');
        deleteHackathonQrFile($old !== false ? $old : null);
        jsonResponse(200, true, 'QR code removido.');
    }

    if ($action === 'delete_team') {
        $teamId = (int) ($data['team_id'] ?? 0);
        $del = $pdo->prepare('DELETE FROM hackathon_teams WHERE id = :id');
        $del->execute([':id' => $teamId]);
        if ($del->rowCount() === 0) {
            jsonResponse(404, false, 'Equipe não encontrada.');
        }
        appLog('admin.hackathon_team_deleted', ['admin_id' => $user['id'], 'team_id' => $teamId]);
        jsonResponse(200, true, 'Equipe removida.');
    }

    if (in_array($action, ['confirm', 'revert', 'reject'], true)) {
        $memberId = (int) ($data['member_id'] ?? 0);
        $note     = htmlspecialchars(strip_tags(trim((string) ($data['note'] ?? ''))), ENT_QUOTES, 'UTF-8');

        $stmt = $pdo->prepare(
            "SELECT id, payment_status, (proof_path IS NOT NULL) AS has_proof
             FROM hackathon_members WHERE id = :id AND invite_status = 'accepted'"
        );
        $stmt->execute([':id' => $memberId]);
        $m = $stmt->fetch();
        if ($m === false) {
            jsonResponse(404, false, 'Integrante não encontrado ou ainda sem vínculo aceito.');
        }

        if ($action === 'confirm') {
            if ($m['payment_status'] === 'paid' || $m['payment_status'] === 'free') {
                jsonResponse(409, false, 'Pagamento já confirmado ou isento.');
            }
            $pdo->prepare(
                "UPDATE hackathon_members
                 SET payment_status = 'paid', paid_at = NOW(), confirmed_by = :by, confirmed_note = :note
                 WHERE id = :id"
            )->execute([':by' => $user['id'], ':note' => $note, ':id' => $memberId]);
            jsonResponse(200, true, 'Pagamento confirmado.');
        }

        if ($action === 'revert') {
            if ($m['payment_status'] !== 'paid') {
                jsonResponse(409, false, 'Só é possível reverter pagamentos confirmados.');
            }
            $pdo->prepare(
                'UPDATE hackathon_members
                 SET payment_status = :status, paid_at = NULL, confirmed_by = :by, confirmed_note = :note
                 WHERE id = :id'
            )->execute([
                ':status' => dbBool($m['has_proof']) ? 'awaiting_confirmation' : 'unpaid',
                ':by'     => $user['id'],
                ':note'   => $note !== '' ? $note : 'Confirmação revertida pelo admin',
                ':id'     => $memberId,
            ]);
            jsonResponse(200, true, 'Confirmação revertida.');
        }

        // reject: comprovante recusado — volta a "aguardando pagamento" para reenvio.
        if ($m['payment_status'] !== 'awaiting_confirmation') {
            jsonResponse(409, false, 'Só é possível recusar comprovantes em análise.');
        }
        $pdo->prepare(
            "UPDATE hackathon_members
             SET payment_status = 'unpaid', proof_path = NULL, proof_uploaded_at = NULL,
                 confirmed_by = :by, confirmed_note = :note
             WHERE id = :id"
        )->execute([':by' => $user['id'], ':note' => $note !== '' ? $note : 'Comprovante recusado', ':id' => $memberId]);
        jsonResponse(200, true, 'Comprovante recusado; o integrante poderá reenviar.');
    }

    jsonResponse(422, false, 'Ação inválida.');
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[TW26] admin/hackathon POST: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao atualizar o hackathon.');
}
