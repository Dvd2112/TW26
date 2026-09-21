#!/usr/bin/env bash
# Deploy incremental: puxa o main, reinstala deps e rebuilda o frontend.
# Rodado manualmente na VM ou via SSH pelo workflow .github/workflows/cd.yml.
#
# Uso: bash deploy/oci/deploy.sh   (a partir da raiz do repo já clonado na VM)

set -euo pipefail

REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PHP_VERSION="8.3"

cd "${REPO_PATH}"

echo "==> git pull"
git fetch origin main
git reset --hard origin/main

echo "==> storage: pastas de upload (comprovantes e QR codes) graváveis pelo php-fpm"
# A raiz do repo é do usuário de deploy; sem isto o php-fpm (www-data) não
# consegue criar storage/ e os uploads falham. É gitignored, então o
# `git reset --hard` acima não apaga o que já foi enviado.
cd "${REPO_PATH}"
mkdir -p storage/comprovantes storage/qrcodes
chgrp www-data storage storage/comprovantes storage/qrcodes \
  || echo "!! aviso: não consegui aplicar o grupo www-data em storage/ (o usuário de deploy está no grupo www-data?)"
chmod 2775 storage storage/comprovantes storage/qrcodes

echo "==> banco: migrations pendentes"
# Aplica backend/database/migrations/*.sql em ordem, uma vez cada. Os arquivos
# já aplicados ficam registrados em schema_migrations. Todas as migrations são
# idempotentes, então na primeira execução (tabela vazia) reaplicá-las é seguro.
DB_NAME="$(grep -E '^DB_NAME=' "${REPO_PATH}/backend/.env" | cut -d= -f2- | tr -d "\"'\r" || true)"
DB_NAME="${DB_NAME:-tw26}"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -q -d "${DB_NAME}")

"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

for migration in "${REPO_PATH}"/backend/database/migrations/*.sql; do
  name="$(basename "${migration}")"
  applied="$("${PSQL[@]}" -tA -c "SELECT 1 FROM schema_migrations WHERE filename = '${name}'")"
  if [ -n "${applied}" ]; then
    continue
  fi
  echo "   aplicando ${name}"
  # Lido via stdin: o usuário postgres pode não ter acesso ao diretório do repo.
  "${PSQL[@]}" < "${migration}"
  "${PSQL[@]}" -c "INSERT INTO schema_migrations (filename) VALUES ('${name}')"
done

echo "==> backend: composer install"
cd "${REPO_PATH}/backend"
composer install --no-dev --no-progress --prefer-dist

echo "==> frontend: build"
cd "${REPO_PATH}/frontend"
npm ci
# Em VMs com pouca RAM (ex.: Always Free E2.1.Micro, 1GB), o build de produção
# do CRA estoura memória — sourcemaps e o plugin do ESLint são os maiores
# consumidores. Desliga os dois (não afeta o site, só telemetria de debug) e
# ainda aumenta o heap do Node como reforço.
GENERATE_SOURCEMAP=false DISABLE_ESLINT_PLUGIN=true NODE_OPTIONS="--max-old-space-size=896" npm run build

echo "==> restart php-fpm"
sudo systemctl reload "php${PHP_VERSION}-fpm"

echo "==> deploy concluído em $(date)"
