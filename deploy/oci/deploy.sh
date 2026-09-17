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

echo "==> backend: composer install"
cd "${REPO_PATH}/backend"
composer install --no-dev --no-progress --prefer-dist

echo "==> frontend: build"
cd "${REPO_PATH}/frontend"
npm ci
# Em VMs com pouca RAM (ex.: Always Free E2.1.Micro, 1GB), o V8 calcula um
# heap padrão baseado só na RAM física e ignora o swap, estourando o build.
# Força um limite maior de heap, que o swap sustenta.
NODE_OPTIONS="--max-old-space-size=1536" npm run build

echo "==> restart php-fpm"
sudo systemctl reload "php${PHP_VERSION}-fpm"

echo "==> deploy concluído em $(date)"
