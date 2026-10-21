<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/http.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/storage.php';
require_once __DIR__ . '/../../config/mailer.php';

corsHeaders();
requireCsrf();

$pdo  = getDbConnection();
$user = requireAnyPermission(['super_admin', 'content_admin']);

const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25MB por arquivo
const MAX_MATERIALS_PER_UPLOAD = 10;
const ALLOWED_MATERIAL_EXTENSIONS = [
    'pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'odt', 'odp', 'ods',
    'txt', 'md', 'csv', 'zip', 'rar', '7z', 'png', 'jpg', 'jpeg', 'gif', 'mp4',
];

function cleanMaterialText(mixed $value): string
{
    return htmlspecialchars(strip_tags(trim((string) $value)), ENT_QUOTES, 'UTF-8');
}

$method = $_SERVER['REQUEST_METHOD'];

/* ─── GET: materiais de todas as atividades (ou de uma) ─────────────────── */
if ($method === 'GET') {
    try {
        $aid = (int) ($_GET['activity_id'] ?? 0);
        $stmt = $pdo->prepare(
            'SELECT id, activity_id, title, original_name, size_bytes, created_at
             FROM activity_materials'
            . ($aid > 0 ? ' WHERE activity_id = :aid' : '')
            . ' ORDER BY created_at DESC, id DESC'
        );
        $stmt->execute($aid > 0 ? [':aid' => $aid] : []);
        jsonResponse(200, true, 'ok', ['materials' => $stmt->fetchAll()]);
    } catch (Exception $e) {
        error_log('[TW26] admin/activity-materials GET: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro ao carregar os materiais.');
    }
}

/* ─── POST (multipart): enviar um ou mais arquivos ───────────────────────── */
if ($method === 'POST') {
    $activityId = (int) ($_POST['activity_id'] ?? 0);
    if ($activityId <= 0) {
        jsonResponse(422, false, 'Atividade inválida.');
    }
    $notify = ($_POST['notify'] ?? '') === 'true';
    $title  = cleanMaterialText($_POST['title'] ?? '');

    // $_FILES['files'] vem "transposto": name[], tmp_name[], error[]...
    $files = [];
    foreach ((array) ($_FILES['files']['name'] ?? []) as $i => $name) {
        $files[] = [
            'name'     => (string) $name,
            'tmp_name' => $_FILES['files']['tmp_name'][$i],
            'error'    => $_FILES['files']['error'][$i],
            'size'     => $_FILES['files']['size'][$i],
        ];
    }
    if ($files === []) {
        jsonResponse(422, false, 'Selecione ao menos um arquivo.');
    }
    if (count($files) > MAX_MATERIALS_PER_UPLOAD) {
        jsonResponse(422, false, 'Envie no máximo ' . MAX_MATERIALS_PER_UPLOAD . ' arquivos por vez.');
    }

    // Valida tudo antes de gravar qualquer coisa.
    foreach ($files as &$f) {
        $f['original'] = cleanMaterialText(basename($f['name']));
        $f['ext']      = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
        if ($f['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(422, false, 'Falha no upload de "' . $f['original'] . '" (limite de ' . (MAX_MATERIAL_BYTES / 1048576) . 'MB por arquivo).');
        }
        if ($f['size'] <= 0 || $f['size'] > MAX_MATERIAL_BYTES) {
            jsonResponse(422, false, '"' . $f['original'] . '" deve ter no máximo ' . (MAX_MATERIAL_BYTES / 1048576) . 'MB.');
        }
        if (!in_array($f['ext'], ALLOWED_MATERIAL_EXTENSIONS, true)) {
            jsonResponse(422, false, 'Formato não permitido: "' . $f['original'] . '".');
        }
    }
    unset($f);

    try {
        $stmt = $pdo->prepare('SELECT title FROM activities WHERE id = :id');
        $stmt->execute([':id' => $activityId]);
        $activity = $stmt->fetch();
        if ($activity === false) {
            jsonResponse(404, false, 'Atividade não encontrada.');
        }

        $insert = $pdo->prepare(
            'INSERT INTO activity_materials (activity_id, title, original_name, file_path, size_bytes, uploaded_by)
             VALUES (:aid, :title, :orig, :path, :size, :by)'
        );
        $titles = [];
        $saved  = [];
        foreach ($files as $f) {
            // Nome gerado pelo servidor — nunca deriva do nome enviado pelo cliente.
            $filename = sprintf('mat_%d_%s.%s', $activityId, bin2hex(random_bytes(16)), $f['ext']);
            if (!move_uploaded_file($f['tmp_name'], storagePath('materiais/' . $filename))) {
                throw new RuntimeException('move_uploaded_file falhou');
            }
            $saved[] = $filename;
            $itemTitle = $title !== '' && count($files) === 1
                ? $title
                : cleanMaterialText(pathinfo($f['name'], PATHINFO_FILENAME));
            $insert->execute([
                ':aid' => $activityId, ':title' => $itemTitle, ':orig' => $f['original'],
                ':path' => $filename, ':size' => (int) $f['size'], ':by' => (int) $user['id'],
            ]);
            $titles[] = html_entity_decode($itemTitle, ENT_QUOTES, 'UTF-8');
        }

        appLog('materials.upload', ['activity_id' => $activityId, 'count' => count($files), 'by' => (int) $user['id']]);

        $mailInfo = null;
        if ($notify) {
            $rec = $pdo->prepare(
                'SELECT u.name, u.email
                 FROM activity_enrollments e JOIN users u ON u.id = e.user_id
                 WHERE e.activity_id = :aid ORDER BY u.id'
            );
            $rec->execute([':aid' => $activityId]);
            set_time_limit(300);
            try {
                $mailInfo = sendActivityMaterialsEmails(
                    $rec->fetchAll(),
                    html_entity_decode($activity['title'], ENT_QUOTES, 'UTF-8'),
                    $titles
                );
            } catch (Throwable $e) {
                // Falha de e-mail nunca desfaz o upload.
                error_log('[TW26] [materiais] ' . $e->getMessage());
                $mailInfo = ['sent' => 0, 'failed' => -1];
            }
        }

        $msg = count($files) === 1 ? 'Material enviado.' : count($files) . ' materiais enviados.';
        if ($mailInfo !== null) {
            $msg .= $mailInfo['failed'] === -1
                ? ' Não foi possível enviar os e-mails.'
                : " E-mail enviado a {$mailInfo['sent']} inscrito(s)" . ($mailInfo['failed'] > 0 ? " ({$mailInfo['failed']} falha(s))." : '.');
        }
        jsonResponse(201, true, $msg, ['email' => $mailInfo]);
    } catch (Exception $e) {
        foreach ($saved ?? [] as $filename) {
            @unlink(storagePath('materiais/' . $filename));
        }
        error_log('[TW26] admin/activity-materials POST: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao salvar os materiais.');
    }
}

/* ─── DELETE: remover material ───────────────────────────────────────────── */
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    $id   = (int) ($data['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        jsonResponse(422, false, 'Material inválido.');
    }
    try {
        $stmt = $pdo->prepare('DELETE FROM activity_materials WHERE id = :id RETURNING file_path');
        $stmt->execute([':id' => $id]);
        $path = $stmt->fetchColumn();
        if ($path === false) {
            jsonResponse(404, false, 'Material não encontrado.');
        }
        @unlink(storagePath('materiais/' . $path));
        appLog('materials.delete', ['id' => $id, 'by' => (int) $user['id']]);
        jsonResponse(200, true, 'Material removido.');
    } catch (Exception $e) {
        error_log('[TW26] admin/activity-materials DELETE: ' . $e->getMessage());
        jsonResponse(500, false, 'Erro interno ao remover o material.');
    }
}

jsonResponse(405, false, 'Método não permitido.');
