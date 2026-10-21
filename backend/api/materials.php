<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/http.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/storage.php';

corsHeaders();
requireMethod('GET');

$user = requireLogin();
$pdo  = getDbConnection();

/** Nome seguro para o cabeçalho Content-Disposition / entrada do zip. */
function materialFilename(string $stored): string
{
    return preg_replace('/[^\w.\- ]+/u', '_', html_entity_decode($stored, ENT_QUOTES, 'UTF-8')) ?: 'material';
}

try {
    // Download de todos os materiais da atividade (um arquivo direto, vários em .zip).
    if (isset($_GET['download_activity'])) {
        $activityId = (int) $_GET['download_activity'];
        $isStaff = array_intersect(['super_admin', 'content_admin'], currentUserPermissions()) !== [];
        $access = $pdo->prepare('SELECT 1 FROM activity_enrollments WHERE user_id = :uid AND activity_id = :aid');
        $access->execute([':uid' => $user['id'], ':aid' => $activityId]);
        if (!$isStaff && $access->fetchColumn() === false) {
            header('Content-Type: application/json; charset=utf-8');
            jsonResponse(404, false, 'Materiais não encontrados.');
        }

        $stmt = $pdo->prepare(
            'SELECT original_name, file_path FROM activity_materials
             WHERE activity_id = :aid ORDER BY created_at, id'
        );
        $stmt->execute([':aid' => $activityId]);
        $items = array_values(array_filter(
            $stmt->fetchAll(),
            fn (array $m) => is_file(storagePath('materiais/' . $m['file_path']))
        ));
        if ($items === []) {
            header('Content-Type: application/json; charset=utf-8');
            jsonResponse(404, false, 'Esta atividade não tem materiais.');
        }

        header('X-Content-Type-Options: nosniff');
        if (count($items) === 1) {
            $path = storagePath('materiais/' . $items[0]['file_path']);
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . materialFilename($items[0]['original_name']) . '"');
            header('Content-Length: ' . (string) filesize($path));
            readfile($path);
            exit;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'tw26mat');
        $zip = new ZipArchive();
        if ($tmp === false || $zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
            header('Content-Type: application/json; charset=utf-8');
            jsonResponse(500, false, 'Erro ao preparar o download.');
        }
        $used = [];
        foreach ($items as $m) {
            $name = materialFilename($m['original_name']);
            // Nomes repetidos viram "arquivo (2).ext" para não se sobrescreverem no zip.
            for ($n = 2; isset($used[$name]); $n++) {
                $name = pathinfo($name, PATHINFO_FILENAME) . " ($n)." . pathinfo($name, PATHINFO_EXTENSION);
            }
            $used[$name] = true;
            $zip->addFile(storagePath('materiais/' . $m['file_path']), $name);
        }
        $zip->close();

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="materiais-atividade-' . $activityId . '.zip"');
        header('Content-Length: ' . (string) filesize($tmp));
        readfile($tmp);
        unlink($tmp);
        exit;
    }

    // Download: só quem está inscrito na atividade (ou a organização).
    if (isset($_GET['download'])) {
        $id = (int) $_GET['download'];
        $stmt = $pdo->prepare(
            'SELECT m.original_name, m.file_path, m.activity_id,
                    EXISTS (SELECT 1 FROM activity_enrollments e
                            WHERE e.activity_id = m.activity_id AND e.user_id = :uid) AS enrolled
             FROM activity_materials m WHERE m.id = :id'
        );
        $stmt->execute([':uid' => $user['id'], ':id' => $id]);
        $m = $stmt->fetch();

        $isStaff = array_intersect(['super_admin', 'content_admin'], currentUserPermissions()) !== [];
        if ($m === false || (!$m['enrolled'] && !$isStaff)) {
            header('Content-Type: application/json; charset=utf-8');
            jsonResponse(404, false, 'Material não encontrado.');
        }

        // file_path é gerado pelo servidor no upload, seguro para montar o caminho.
        $path = storagePath('materiais/' . $m['file_path']);
        if (!is_file($path)) {
            header('Content-Type: application/json; charset=utf-8');
            jsonResponse(404, false, 'Arquivo não encontrado.');
        }

        // original_name já foi saneado no upload (sem aspas/quebras de linha após htmlspecialchars)
        $name = materialFilename($m['original_name']);
        header('Content-Type: application/octet-stream');
        header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: attachment; filename="' . $name . '"');
        header('Content-Length: ' . (string) filesize($path));
        readfile($path);
        exit;
    }

    // Lista: materiais das atividades em que estou inscrito.
    header('Content-Type: application/json; charset=utf-8');
    $stmt = $pdo->prepare(
        'SELECT m.id, m.activity_id, m.title, m.original_name, m.size_bytes, m.created_at
         FROM activity_materials m
         JOIN activity_enrollments e ON e.activity_id = m.activity_id AND e.user_id = :uid
         ORDER BY m.created_at DESC, m.id DESC'
    );
    $stmt->execute([':uid' => $user['id']]);
    jsonResponse(200, true, 'ok', ['materials' => $stmt->fetchAll()]);
} catch (Exception $e) {
    error_log('[TW26] materials.php: ' . $e->getMessage());
    header('Content-Type: application/json; charset=utf-8');
    jsonResponse(500, false, 'Erro ao carregar os materiais.');
}
