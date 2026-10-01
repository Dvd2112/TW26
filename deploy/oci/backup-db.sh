#!/usr/bin/env bash
# Backup do banco de produção: puxa um dump comprimido (.sql.gz) da VM OCI.
#
# Roda da MÁQUINA LOCAL (usa o host SSH "techweek" definido em ~/.ssh/config),
# não na VM — ao contrário de deploy.sh/setup.sh, que rodam lá dentro.
#
# Uso: bash deploy/oci/backup-db.sh
# Alias: tw-backup-db (ver ~/.bash_aliases)

set -euo pipefail

SSH_HOST="techweek"
DB_NAME="tw26"                                    # ajuste se DB_NAME divergir no .env da VM
BACKUP_DIR="${TW26_BACKUP_DIR:-$HOME/tw26-backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/tw26_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "==> Gerando dump de '${DB_NAME}' em ${SSH_HOST} e baixando comprimido"
ssh "${SSH_HOST}" "sudo -u postgres pg_dump ${DB_NAME} | gzip" > "${OUT_FILE}"

SIZE="$(du -h "${OUT_FILE}" | cut -f1)"
echo "==> Backup salvo em ${OUT_FILE} (${SIZE})"
