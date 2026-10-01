<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/hackathon.php';
require_once __DIR__ . '/../config/mailer.php';

corsHeaders();
requireCsrf();

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) {
    jsonResponse(405, false, 'Método não permitido.');
}

const TEAM_NAME_MIN = 3;
const TEAM_NAME_MAX = 60;

/** CPF mascarado (123.***.***-00) — nunca devolve o CPF completo de terceiros. */
function maskCpf(string $cpf): string
{
    return substr($cpf, 0, 3) . '.***.***-' . substr($cpf, 9, 2);
}

/**
 * Valida e sanitiza um integrante vindo do formulário.
 *
 * @return array{0: ?array{name:string,cpf:string,email:string}, 1: ?string} [dados, erro]
 */
function cleanMemberInput(mixed $raw): array
{
    if (!is_array($raw)) {
        return [null, 'Dados de integrante inválidos.'];
    }

    $name  = htmlspecialchars(strip_tags(trim((string) ($raw['name'] ?? ''))), ENT_QUOTES, 'UTF-8');
    $cpf   = normalizeCpf((string) ($raw['cpf'] ?? ''));
    $email = filter_var(strtolower(trim((string) ($raw['email'] ?? ''))), FILTER_VALIDATE_EMAIL);

    if ($name === '' || mb_strlen($name) > 120) {
        return [null, 'Informe o nome de cada integrante.'];
    }
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1+$/', $cpf)) {
        return [null, "CPF inválido para {$name}."];
    }
    if ($email === false || strlen($email) > 254) {
        return [null, "E-mail inválido para {$name}."];
    }

    return [['name' => $name, 'cpf' => $cpf, 'email' => $email], null];
}

/** Equipe do usuário (como integrante aceito) ou null. */
function findMyMembership(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT m.id AS member_id, m.is_leader, m.team_id, t.name AS team_name
         FROM hackathon_members m
         JOIN hackathon_teams t ON t.id = m.team_id
         WHERE m.user_id = :uid AND m.invite_status = 'accepted'
         LIMIT 1"
    );
    $stmt->execute([':uid' => $userId]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/** Alguém com este CPF/e-mail já integra (aceitou) alguma equipe? */
function isAlreadyInATeam(PDO $pdo, string $cpf, string $email): bool
{
    $stmt = $pdo->prepare(
        "SELECT 1 FROM hackathon_members
         WHERE invite_status = 'accepted' AND (cpf = :cpf OR email = :email) LIMIT 1"
    );
    $stmt->execute([':cpf' => $cpf, ':email' => $email]);
    return $stmt->fetchColumn() !== false;
}

function insertMember(PDO $pdo, int $teamId, array $m, bool $leader, ?int $userId): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO hackathon_members (team_id, user_id, name, cpf, email, is_leader, invite_status, responded_at)
         VALUES (:team, :uid, :name, :cpf, :email, :leader, :status, :responded)
         RETURNING id'
    );
    $stmt->bindValue(':team', $teamId, PDO::PARAM_INT);
    $stmt->bindValue(':uid', $userId, $userId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(':name', $m['name']);
    $stmt->bindValue(':cpf', $m['cpf']);
    $stmt->bindValue(':email', $m['email']);
    $stmt->bindValue(':leader', $leader, PDO::PARAM_BOOL);
    $stmt->bindValue(':status', $leader ? 'accepted' : 'pending');
    $stmt->bindValue(':responded', $leader ? (new DateTimeImmutable('now'))->format('Y-m-d H:i:sP') : null);
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

/** Envio de convites: falha de e-mail nunca derruba a inscrição. */
function sendInvites(array $members, string $teamName, string $leaderName): void
{
    foreach ($members as $m) {
        try {
            sendHackathonInviteEmail($m['email'], $m['name'], $teamName, $leaderName);
        } catch (Throwable $e) {
            appLog('hackathon.invite_email_failed', ['error' => $e->getMessage()]);
        }
    }
}

function loadUserIdentity(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare('SELECT name, cpf, email FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    $row = $stmt->fetch();
    return [
        'name'  => (string) $row['name'],
        'cpf'   => normalizeCpf((string) $row['cpf']),
        'email' => strtolower((string) $row['email']),
    ];
}

/* ─── GET: configuração pública + minha equipe + convites ────────────────── */
if ($method === 'GET') {
    try {
        $pdo      = getDbConnection();
        $settings = hackathonSettings($pdo);
        $teams    = hackathonTeamCount($pdo);
        $user     = currentUser();

        $response = [
            'settings' => [
                'registrations_open'         => $settings['registrations_open'],
                'price'                      => $settings['price'],
                'free_for_paid_participants' => $settings['free_for_paid_participants'],
                'charge_others'              => $settings['charge_others'],
                'min_team_size'              => $settings['min_team_size'],
                'max_team_size'              => $settings['max_team_size'],
                'max_teams'                  => $settings['max_teams'],
                'teams_count'                => $teams,
                'is_full'                    => $settings['max_teams'] !== null && $teams >= $settings['max_teams'],
            ],
            'logged_in'    => $user !== null,
            'team'         => null,
            'invites'      => [],
            'price_for_me' => null,
        ];

        if ($user === null) {
            jsonResponse(200, true, 'ok', $response);
        }

        $me         = loadUserIdentity($pdo, (int) $user['id']);
        $membership = findMyMembership($pdo, (int) $user['id']);

        $response['price_for_me'] = hackathonPriceFor($pdo, (int) $user['id'], $settings);

        if ($membership !== null) {
            // Regra/preço podem ter mudado desde o aceite: reavalia enquanto não pagou.
            $pdo->beginTransaction();
            hackathonApplyPrice($pdo, (int) $membership['member_id'], (int) $user['id'], $settings);
            $pdo->commit();

            $stmt = $pdo->prepare(
                'SELECT id, name, cpf, email, is_leader, invite_status, amount, payment_status
                 FROM hackathon_members WHERE team_id = :team
                 ORDER BY is_leader DESC, id ASC'
            );
            $stmt->execute([':team' => $membership['team_id']]);

            $members = [];
            $mine    = null;
            foreach ($stmt->fetchAll() as $row) {
                $item = [
                    'id'             => (int) $row['id'],
                    'name'           => $row['name'],
                    'email'          => $row['email'],
                    'cpf'            => maskCpf($row['cpf']),
                    'is_leader'      => dbBool($row['is_leader']),
                    'invite_status'  => $row['invite_status'],
                    'amount'         => (float) $row['amount'],
                    'payment_status' => $row['payment_status'],
                    'is_me'          => (int) $row['id'] === (int) $membership['member_id'],
                ];
                if ($item['is_me']) {
                    $mine = $item;
                }
                $members[] = $item;
            }

            $response['team'] = [
                'id'        => (int) $membership['team_id'],
                'name'      => $membership['team_name'],
                'i_am_leader' => dbBool($membership['is_leader']),
                'members'   => $members,
                'my_member' => $mine,
                'pix'       => [
                    'key'      => env('PIX_KEY', ''),
                    'name'     => env('PIX_NAME', ''),
                    'city'     => env('PIX_CITY', ''),
                    'has_qr'   => $settings['has_qr'],
                    'pix_link' => $settings['pix_link'],
                ],
            ];
        } else {
            $stmt = $pdo->prepare(
                "SELECT m.id, t.name AS team_name, l.name AS leader_name
                 FROM hackathon_members m
                 JOIN hackathon_teams t   ON t.id = m.team_id
                 JOIN hackathon_members l ON l.team_id = t.id AND l.is_leader = true
                 WHERE m.invite_status = 'pending' AND m.user_id IS NULL
                   AND (m.cpf = :cpf OR m.email = :email)
                 ORDER BY m.created_at DESC"
            );
            $stmt->execute([':cpf' => $me['cpf'], ':email' => $me['email']]);
            $response['invites'] = array_map(static fn (array $r): array => [
                'id'          => (int) $r['id'],
                'team_name'   => $r['team_name'],
                'leader_name' => $r['leader_name'],
            ], $stmt->fetchAll());
        }

        jsonResponse(200, true, 'ok', $response);
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TW26] hackathon.php GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar o hackathon.');
    }
}

/* ─── POST: ações do usuário logado ──────────────────────────────────────── */
$user = requireLogin();

$data = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($data)) {
    jsonResponse(400, false, 'JSON inválido.');
}
$action = (string) ($data['action'] ?? '');

try {
    $pdo = getDbConnection();
    $pdo->beginTransaction();

    // Trava a configuração: serializa criação de equipes (limite) e mudanças de regra.
    $pdo->query('SELECT id FROM hackathon_settings WHERE id = 1 FOR UPDATE');
    $settings   = hackathonSettings($pdo);
    $uid        = (int) $user['id'];
    $me         = loadUserIdentity($pdo, $uid);
    $membership = findMyMembership($pdo, $uid);

    /* ── criar equipe ── */
    if ($action === 'create_team') {
        if (!$settings['registrations_open']) {
            $pdo->rollBack();
            jsonResponse(422, false, 'As inscrições do hackathon não estão abertas.');
        }
        if ($settings['max_teams'] !== null && hackathonTeamCount($pdo) >= $settings['max_teams']) {
            $pdo->rollBack();
            jsonResponse(409, false, 'As vagas de equipes do hackathon estão esgotadas.');
        }
        if ($membership !== null) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Você já faz parte de uma equipe do hackathon.');
        }

        $teamName = htmlspecialchars(strip_tags(trim((string) ($data['team_name'] ?? ''))), ENT_QUOTES, 'UTF-8');
        if (mb_strlen($teamName) < TEAM_NAME_MIN || mb_strlen($teamName) > TEAM_NAME_MAX) {
            $pdo->rollBack();
            jsonResponse(422, false, 'O nome da equipe deve ter entre ' . TEAM_NAME_MIN . ' e ' . TEAM_NAME_MAX . ' caracteres.');
        }

        $rawMembers = is_array($data['members'] ?? null) ? array_values($data['members']) : [];
        $size       = count($rawMembers) + 1; // + quem inscreve
        if ($size < $settings['min_team_size'] || $size > $settings['max_team_size']) {
            $pdo->rollBack();
            jsonResponse(422, false, sprintf(
                'A equipe deve ter entre %d e %d integrantes (contando você).',
                $settings['min_team_size'],
                $settings['max_team_size']
            ));
        }

        $seenCpf   = [$me['cpf'] => true];
        $seenEmail = [$me['email'] => true];
        $members   = [];
        foreach ($rawMembers as $raw) {
            [$m, $err] = cleanMemberInput($raw);
            if ($m === null) {
                $pdo->rollBack();
                jsonResponse(422, false, $err);
            }
            if (isset($seenCpf[$m['cpf']]) || isset($seenEmail[$m['email']])) {
                $pdo->rollBack();
                jsonResponse(422, false, "{$m['name']} está repetido na equipe (CPF ou e-mail iguais a outro integrante, ou aos seus).");
            }
            if (isAlreadyInATeam($pdo, $m['cpf'], $m['email'])) {
                $pdo->rollBack();
                jsonResponse(409, false, "{$m['name']} já faz parte de outra equipe do hackathon.");
            }
            $seenCpf[$m['cpf']] = $seenEmail[$m['email']] = true;
            $members[] = $m;
        }

        $dup = $pdo->prepare('SELECT 1 FROM hackathon_teams WHERE lower(name) = lower(:n)');
        $dup->execute([':n' => $teamName]);
        if ($dup->fetchColumn() !== false) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Já existe uma equipe com este nome.');
        }

        $pdo->prepare('INSERT INTO hackathon_teams (name, created_by) VALUES (:name, :uid)')
            ->execute([':name' => $teamName, ':uid' => $uid]);
        $teamId = (int) $pdo->lastInsertId('hackathon_teams_id_seq');

        $leaderMemberId = insertMember($pdo, $teamId, $me, true, $uid);
        hackathonApplyPrice($pdo, $leaderMemberId, $uid, $settings);
        foreach ($members as $m) {
            insertMember($pdo, $teamId, $m, false, null);
        }

        $pdo->commit();
        appLog('hackathon.team_created', ['user_id' => $uid, 'team_id' => $teamId, 'size' => $size]);
        sendInvites($members, $teamName, $me['name']);

        jsonResponse(201, true, 'Equipe inscrita! Os integrantes receberam o convite para aceitar o vínculo.');
    }

    /* ── responder convite ── */
    if ($action === 'respond') {
        $memberId = (int) ($data['member_id'] ?? 0);
        $decision = (string) ($data['decision'] ?? '');
        if ($memberId <= 0 || !in_array($decision, ['accept', 'reject'], true)) {
            $pdo->rollBack();
            jsonResponse(422, false, 'Resposta inválida.');
        }

        // Só responde quem é o convidado: CPF ou e-mail batem com os da conta.
        $stmt = $pdo->prepare(
            "SELECT id FROM hackathon_members
             WHERE id = :id AND invite_status = 'pending' AND user_id IS NULL
               AND (cpf = :cpf OR email = :email)
             FOR UPDATE"
        );
        $stmt->execute([':id' => $memberId, ':cpf' => $me['cpf'], ':email' => $me['email']]);
        if ($stmt->fetch() === false) {
            $pdo->rollBack();
            jsonResponse(404, false, 'Convite não encontrado ou já respondido.');
        }

        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:sP');

        if ($decision === 'reject') {
            $pdo->prepare(
                "UPDATE hackathon_members SET invite_status = 'rejected', user_id = :uid, responded_at = :now WHERE id = :id"
            )->execute([':uid' => $uid, ':now' => $now, ':id' => $memberId]);
            $pdo->commit();
            jsonResponse(200, true, 'Convite rejeitado.');
        }

        if ($membership !== null) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Você já faz parte de uma equipe do hackathon.');
        }

        $pdo->prepare(
            "UPDATE hackathon_members SET invite_status = 'accepted', user_id = :uid, responded_at = :now WHERE id = :id"
        )->execute([':uid' => $uid, ':now' => $now, ':id' => $memberId]);
        hackathonApplyPrice($pdo, $memberId, $uid, $settings);
        $pdo->commit();

        appLog('hackathon.invite_accepted', ['user_id' => $uid, 'member_id' => $memberId]);
        jsonResponse(200, true, 'Você entrou na equipe!');
    }

    // Demais ações exigem ser integrante de uma equipe.
    if ($membership === null) {
        $pdo->rollBack();
        jsonResponse(404, false, 'Você ainda não faz parte de uma equipe do hackathon.');
    }
    $teamId   = (int) $membership['team_id'];
    $isLeader = dbBool($membership['is_leader']);

    /* ── sair da equipe (integrante não-líder) ── */
    if ($action === 'leave') {
        if ($isLeader) {
            $pdo->rollBack();
            jsonResponse(422, false, 'O líder não pode sair: desfaça a equipe ou fale com a organização.');
        }
        $stmt = $pdo->prepare('SELECT payment_status FROM hackathon_members WHERE id = :id');
        $stmt->execute([':id' => $membership['member_id']]);
        if (in_array($stmt->fetchColumn(), ['awaiting_confirmation', 'paid'], true)) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Seu pagamento já foi enviado: fale com a organização para sair da equipe.');
        }
        $pdo->prepare('DELETE FROM hackathon_members WHERE id = :id')->execute([':id' => $membership['member_id']]);
        $pdo->commit();
        jsonResponse(200, true, 'Você saiu da equipe.');
    }

    // A partir daqui, só o líder.
    if (!$isLeader) {
        $pdo->rollBack();
        jsonResponse(403, false, 'Apenas quem inscreveu a equipe pode fazer isso.');
    }

    /* ── adicionar integrante ── */
    if ($action === 'add_member') {
        if (!$settings['registrations_open']) {
            $pdo->rollBack();
            jsonResponse(422, false, 'As inscrições do hackathon não estão abertas.');
        }
        [$m, $err] = cleanMemberInput($data['member'] ?? null);
        if ($m === null) {
            $pdo->rollBack();
            jsonResponse(422, false, $err);
        }

        $count = $pdo->prepare("SELECT count(*) FROM hackathon_members WHERE team_id = :t AND invite_status <> 'rejected'");
        $count->execute([':t' => $teamId]);
        if ((int) $count->fetchColumn() >= $settings['max_team_size']) {
            $pdo->rollBack();
            jsonResponse(422, false, "A equipe já está no limite de {$settings['max_team_size']} integrantes.");
        }

        $dup = $pdo->prepare(
            "SELECT 1 FROM hackathon_members WHERE team_id = :t AND (cpf = :cpf OR email = :email) AND invite_status <> 'rejected'"
        );
        $dup->execute([':t' => $teamId, ':cpf' => $m['cpf'], ':email' => $m['email']]);
        if ($dup->fetchColumn() !== false) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Este integrante já está na equipe.');
        }
        if (isAlreadyInATeam($pdo, $m['cpf'], $m['email'])) {
            $pdo->rollBack();
            jsonResponse(409, false, "{$m['name']} já faz parte de outra equipe do hackathon.");
        }

        // Um convite rejeitado da mesma pessoa é substituído pelo novo.
        $pdo->prepare("DELETE FROM hackathon_members WHERE team_id = :t AND (cpf = :cpf OR email = :email) AND invite_status = 'rejected'")
            ->execute([':t' => $teamId, ':cpf' => $m['cpf'], ':email' => $m['email']]);
        insertMember($pdo, $teamId, $m, false, null);
        $pdo->commit();

        sendInvites([$m], $membership['team_name'], $me['name']);
        jsonResponse(201, true, 'Convite enviado.');
    }

    /* ── remover integrante ── */
    if ($action === 'remove_member') {
        $memberId = (int) ($data['member_id'] ?? 0);
        $stmt = $pdo->prepare(
            'SELECT id, is_leader, payment_status FROM hackathon_members WHERE id = :id AND team_id = :t'
        );
        $stmt->execute([':id' => $memberId, ':t' => $teamId]);
        $target = $stmt->fetch();

        if ($target === false) {
            $pdo->rollBack();
            jsonResponse(404, false, 'Integrante não encontrado.');
        }
        if (dbBool($target['is_leader'])) {
            $pdo->rollBack();
            jsonResponse(422, false, 'Para sair, desfaça a equipe.');
        }
        if (in_array($target['payment_status'], ['awaiting_confirmation', 'paid'], true)) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Este integrante já enviou o pagamento: fale com a organização.');
        }
        $pdo->prepare('DELETE FROM hackathon_members WHERE id = :id')->execute([':id' => $memberId]);
        $pdo->commit();
        jsonResponse(200, true, 'Integrante removido.');
    }

    /* ── desfazer equipe ── */
    if ($action === 'disband') {
        $stmt = $pdo->prepare(
            "SELECT count(*) FROM hackathon_members
             WHERE team_id = :t AND payment_status IN ('awaiting_confirmation', 'paid')"
        );
        $stmt->execute([':t' => $teamId]);
        if ((int) $stmt->fetchColumn() > 0) {
            $pdo->rollBack();
            jsonResponse(409, false, 'Há pagamentos enviados nesta equipe: fale com a organização para desfazê-la.');
        }
        $pdo->prepare('DELETE FROM hackathon_teams WHERE id = :id')->execute([':id' => $teamId]);
        $pdo->commit();
        appLog('hackathon.team_disbanded', ['user_id' => $uid, 'team_id' => $teamId]);
        jsonResponse(200, true, 'Equipe desfeita.');
    }

    $pdo->rollBack();
    jsonResponse(422, false, 'Ação inválida.');
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23505') {
        jsonResponse(409, false, 'Conflito: nome de equipe em uso ou integrante já vinculado a outra equipe.');
    }
    error_log('[TW26] hackathon.php POST: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao processar o hackathon.');
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[TW26] hackathon.php POST: ' . $e->getMessage());
    jsonResponse(500, false, 'Erro interno ao processar o hackathon.');
}
