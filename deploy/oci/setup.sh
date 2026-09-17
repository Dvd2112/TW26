#!/usr/bin/env bash
# Bootstrap de uma VM Ubuntu (22.04/24.04) na OCI Always Free para hospedar
# o TechWeek 2026 (frontend + backend + PostgreSQL na mesma instância).
#
# Uso (uma única vez, como root/sudo, logo após criar a instância):
#   curl -fsSL https://raw.githubusercontent.com/<seu-usuario>/TW26/main/deploy/oci/setup.sh | sudo bash
# ou, com o repo já clonado:
#   sudo bash deploy/oci/setup.sh
#
# Idempotente: pode ser rodado de novo sem quebrar nada.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Dvd2112/TW26.git}"
REPO_PATH="${REPO_PATH:-/var/www/techweek2026}"
DB_NAME="${DB_NAME:-tw26}"
DB_USER="${DB_USER:-tw26}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
PHP_VERSION="8.3"

echo "==> Atualizando pacotes"
apt-get update -y
apt-get upgrade -y

echo "==> Instalando nginx, PHP-FPM, PostgreSQL, git, composer, node"
apt-get install -y software-properties-common ca-certificates curl gnupg unzip git ufw

add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y \
  nginx \
  "php${PHP_VERSION}-fpm" "php${PHP_VERSION}-pgsql" "php${PHP_VERSION}-mbstring" \
  "php${PHP_VERSION}-xml" "php${PHP_VERSION}-curl" "php${PHP_VERSION}-zip" "php${PHP_VERSION}-intl" \
  postgresql postgresql-contrib

if ! command -v composer >/dev/null 2>&1; then
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Configurando firewall (ufw)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# As instâncias Oracle Linux/Ubuntu na OCI costumam vir com iptables extra
# bloqueando tudo que não seja a porta 22, além da Security List do VCN.
# Libera 80/443 também no iptables cru, caso existam regras herdadas da imagem.
if command -v iptables >/dev/null 2>&1; then
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  netfilter-persistent save 2>/dev/null || true
fi

echo "==> Criando usuário e banco PostgreSQL (se não existirem)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD 'troque_esta_senha';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "==> Clonando/atualizando o repositório em ${REPO_PATH}"
if [ ! -d "${REPO_PATH}/.git" ]; then
  mkdir -p "$(dirname "${REPO_PATH}")"
  git clone "${REPO_URL}" "${REPO_PATH}"
else
  git -C "${REPO_PATH}" pull
fi

echo "==> Aplicando schema (só na primeira vez — ignora erro se já existir)"
sudo -u postgres psql -d "${DB_NAME}" -f "${REPO_PATH}/backend/database/schema.sql" || true
sudo -u postgres psql -d "${DB_NAME}" -f "${REPO_PATH}/backend/database/seed.sql" || true

if [ ! -f "${REPO_PATH}/backend/.env" ]; then
  # parse_ini_file() (usado por backend/config/database.php) não lida bem com
  # os comentários decorativos do .env.example (parênteses, CRLF do Windows)
  # — gera um .env "limpo", só com CHAVE=valor.
  grep -v -E '^\s*#|^\s*$' "${REPO_PATH}/backend/.env.example" | tr -d '\r' > "${REPO_PATH}/backend/.env"
  echo "!! Edite ${REPO_PATH}/backend/.env com as credenciais reais (DB_PASS, SMTP_*, APP_URL, etc.)"
fi

echo "==> Instalando site nginx"
cp "${REPO_PATH}/deploy/oci/nginx-techweek2026.conf" /etc/nginx/sites-available/techweek2026.conf
sed -i "s#__REPO_PATH__#${REPO_PATH}#g; s#__PHP_VERSION__#${PHP_VERSION}#g" /etc/nginx/sites-available/techweek2026.conf
ln -sf /etc/nginx/sites-available/techweek2026.conf /etc/nginx/sites-enabled/techweek2026.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx "php${PHP_VERSION}-fpm" postgresql
systemctl restart "php${PHP_VERSION}-fpm"

chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${REPO_PATH}"
usermod -a -G www-data "${DEPLOY_USER}"

# Permite que o usuário de deploy (usado pelo CD via SSH) recarregue o
# php-fpm sem senha, necessário para deploy.sh rodar de forma não-interativa.
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload php${PHP_VERSION}-fpm, /usr/bin/systemctl restart php${PHP_VERSION}-fpm" \
  > "/etc/sudoers.d/techweek2026-deploy"
chmod 440 "/etc/sudoers.d/techweek2026-deploy"

echo "==> Feito. Próximos passos manuais:"
echo "  1) Editar ${REPO_PATH}/backend/.env (senha do banco, SMTP, APP_URL=http://<IP-da-VM>)"
echo "  2) cd ${REPO_PATH} && bash deploy/oci/deploy.sh   # builda o frontend e instala deps do backend"
echo "  3) Acessar http://<IP-publico-da-VM>/TW26/"
