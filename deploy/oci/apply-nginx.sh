#!/usr/bin/env bash
# Reaplica a conf do nginx do repo (redirects /TW26, página 404 da marca) numa VM
# já provisionada, valida e recarrega. Opcionalmente ajusta o APP_URL do backend.
#
# Uso (a partir da raiz do repo já atualizado na VM):
#   bash deploy/oci/apply-nginx.sh
#   APP_URL=https://techweekfb.com.br bash deploy/oci/apply-nginx.sh
#
# Idempotente. Se o `nginx -t` falhar, restaura a conf anterior e não recarrega.

set -euo pipefail

REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PHP_VERSION="${PHP_VERSION:-8.3}"
SITE="/etc/nginx/sites-available/techweek2026.conf"
BACKUP="${SITE}.bak"

if [ -f "${SITE}" ]; then
  echo "==> backup da conf atual em ${BACKUP}"
  sudo cp "${SITE}" "${BACKUP}"
fi

echo "==> instalando conf do nginx"
sudo cp "${REPO_PATH}/deploy/oci/nginx-techweek2026.conf" "${SITE}"
sudo sed -i "s#__REPO_PATH__#${REPO_PATH}#g; s#__PHP_VERSION__#${PHP_VERSION}#g" "${SITE}"
sudo ln -sf "${SITE}" /etc/nginx/sites-enabled/techweek2026.conf

echo "==> nginx -t"
if ! sudo nginx -t; then
  echo "!! conf inválida: restaurando a anterior"
  if [ -f "${BACKUP}" ]; then
    sudo cp "${BACKUP}" "${SITE}"
  fi
  exit 1
fi
sudo systemctl reload nginx

if [ -n "${APP_URL:-}" ]; then
  ENV_FILE="${REPO_PATH}/backend/.env"
  echo "==> APP_URL=${APP_URL} em ${ENV_FILE}"
  if grep -q '^APP_URL=' "${ENV_FILE}"; then
    sed -i "s#^APP_URL=.*#APP_URL=${APP_URL}#" "${ENV_FILE}"
  else
    echo "APP_URL=${APP_URL}" >> "${ENV_FILE}"
  fi
  sudo systemctl reload "php${PHP_VERSION}-fpm"
fi

echo "==> verificação"
check() {
  # $1 = descrição, $2 = status esperado, $3 = URL
  local got
  got="$(curl -s -o /dev/null -w '%{http_code}' "$3" || true)"
  if [ "${got}" = "$2" ]; then
    echo "   ok    ${1} (${got})"
  else
    echo "   FALHA ${1}: esperado ${2}, veio ${got}"
    FAILED=1
  fi
}
FAILED=0
check "/TW26 -> /TW26/"                 301 "http://localhost/TW26"
check "/?page=hackathon -> /TW26/..."   302 "http://localhost/?page=hackathon"
check "/TW26/ (SPA)"                    200 "http://localhost/TW26/"
check "endpoint inexistente -> 404"     404 "http://localhost/TW26/backend/nao-existe.php"
check "/storage/ bloqueado"             403 "http://localhost/storage/qrcodes/x"

if [ "${FAILED}" -ne 0 ]; then
  echo "!! alguma verificação falhou (a conf foi aplicada; revise acima)"
  exit 1
fi
echo "==> pronto"
