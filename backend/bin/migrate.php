<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

/** @return never */
function failMigration(string $message): never
{
    fwrite(STDERR, "[TW26] Migração interrompida: {$message}\n");
    exit(1);
}

try {
    $pdo = getDbConnection();
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )'
    );

    $files = glob(__DIR__ . '/../database/migrations/*.sql') ?: [];
    natsort($files);

    $applied = $pdo->query('SELECT filename FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
    $appliedByName = array_fill_keys($applied, true);
    $record = $pdo->prepare('INSERT INTO schema_migrations (filename) VALUES (:filename)');
    $pending = 0;

    foreach ($files as $file) {
        $filename = basename($file);
        if (isset($appliedByName[$filename])) {
            continue;
        }

        $sql = file_get_contents($file);
        if ($sql === false) {
            failMigration("não foi possível ler {$filename}.");
        }

        fwrite(STDOUT, "[TW26] Aplicando {$filename}...\n");
        try {
            $pdo->exec($sql);
            $record->execute([':filename' => $filename]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('[TW26] migrate.php ' . $filename . ': ' . $e->getMessage());
            failMigration("falha ao aplicar {$filename}. Consulte o log do servidor.");
        }

        $pending++;
    }

    fwrite(STDOUT, $pending === 0
        ? "[TW26] Nenhuma migration pendente.\n"
        : "[TW26] {$pending} migration(s) aplicada(s) com sucesso.\n");
} catch (Throwable $e) {
    error_log('[TW26] migrate.php: ' . $e->getMessage());
    failMigration('não foi possível conectar ao banco ou preparar o controle de migrations.');
}
