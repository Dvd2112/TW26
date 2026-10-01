#!/usr/bin/env bash
# Sobrescreve o banco LOCAL com um dump baixado (ver backup-db.sh).
#
# Lê a conexão de backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS).
# Por padrão usa o backup mais recente de ~/tw26-backups; aceita outro
# arquivo .sql.gz como argumento.
#
# Uso: bash deploy/oci/restore-local-db.sh [arquivo.sql.gz] [--yes]
# Alias: tw-restore-db (ver ~/.bash_aliases)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_DIR}/backend/.env"
BACKUP_DIR="${TW26_BACKUP_DIR:-$HOME/tw26-backups}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "!! ${ENV_FILE} não encontrado" >&2
  exit 1
fi

get_env() {
  grep -E "^$1=" "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '\r'
}

DB_HOST="$(get_env DB_HOST)"
DB_PORT="$(get_env DB_PORT)"
DB_NAME="$(get_env DB_NAME)"
DB_USER="$(get_env DB_USER)"
DB_PASS="$(get_env DB_PASS)"

DUMP=""
SKIP_CONFIRM=0
for arg in "$@"; do
  case "${arg}" in
    --yes|-y) SKIP_CONFIRM=1 ;;
    *) DUMP="${arg}" ;;
  esac
done

if [ -z "${DUMP}" ]; then
  DUMP="$(ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1 || true)"
fi
if [ -z "${DUMP}" ] || [ ! -f "${DUMP}" ]; then
  echo "!! Nenhum dump encontrado em ${BACKUP_DIR}. Rode tw-backup-db antes, ou passe o caminho do .sql.gz." >&2
  exit 1
fi

echo "==> Banco local: ${DB_NAME}@${DB_HOST}:${DB_PORT} (user ${DB_USER})"
echo "==> Dump: ${DUMP}"

if [ "${SKIP_CONFIRM}" -ne 1 ]; then
  echo "!! Isso APAGA o banco local '${DB_NAME}' e recria a partir do dump."
  read -r -p "Confirma? (digite 'sim' para continuar) " CONFIRM
  if [ "${CONFIRM}" != "sim" ]; then
    echo "Cancelado."
    exit 1
  fi
fi

export PGPASSWORD="${DB_PASS}"

echo "==> Recriando banco '${DB_NAME}'"
dropdb --if-exists -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"
createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"

echo "==> Aplicando dump"
gunzip -c "${DUMP}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

echo "==> Banco local '${DB_NAME}' restaurado a partir de ${DUMP}"
echo "    (erros 'role ... does not exist' acima são esperados e inofensivos)"
