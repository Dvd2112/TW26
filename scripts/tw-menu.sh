#!/usr/bin/env bash
# Menu interativo (setas ↑/↓ + Enter) com os aliases e scripts do projeto TW26.
#
# Uso: bash scripts/tw-menu.sh
# Global: ln -sf <repo>/scripts/tw-menu.sh ~/.local/bin/tw  (depois é só digitar `tw`)
# Teclas: ↑/↓ (ou k/j) navegam, Enter executa, q/Esc sai.
#
# Os aliases de ~/.bash_aliases (tw-back, tw-front, tw-dev, tw-backup-db,
# tw-restore-db) não existem dentro de scripts; aqui os comandos são repetidos.

set -uo pipefail

TW26_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"

C_TITLE=$'\e[1;35m'; C_SEL=$'\e[1;30;45m'; C_DIM=$'\e[2m'; C_OFF=$'\e[0m'

confirm() {
  read -rp "$1 [s/N] " ans
  [[ "$ans" =~ ^[sS]$ ]]
}

# ---------- ações ----------
get_env() { grep -E "^$1=" "$TW26_DIR/backend/.env" | head -1 | cut -d= -f2- | tr -d '\r'; }
act_dev_all() {
  cd "$TW26_DIR" || return 1
  php -S localhost:8080 backend/router.php &
  local back=$!
  trap 'kill $back 2>/dev/null' EXIT INT TERM
  cd frontend && npm start
}
act_back()     { cd "$TW26_DIR" && php -S localhost:8080 backend/router.php; }
act_front()    { cd "$TW26_DIR/frontend" && npm start; }
act_install()  { cd "$TW26_DIR/frontend" && npm install; }
act_lint()     { cd "$TW26_DIR/frontend" && npm run lint; }
act_build()    { cd "$TW26_DIR/frontend" && npm run build; }
act_deploy()   { confirm "Publicar no GitHub Pages?" && cd "$TW26_DIR/frontend" && npm run deploy; }
act_composer() { cd "$TW26_DIR/backend" && composer install; }
act_migrate()  { php "$TW26_DIR/backend/bin/migrate.php"; }
act_initdb() {
  local env="$TW26_DIR/backend/.env"
  [ -f "$env" ] || { echo "!! $env não encontrado"; return 1; }
  local h p n u
  h="$(get_env DB_HOST)"; p="$(get_env DB_PORT)"; n="$(get_env DB_NAME)"; u="$(get_env DB_USER)"
  echo "Banco (backend/.env): $n@$h:$p (user $u)"
  echo "!! Isso APAGA TODOS os dados do banco '$n' e recria do zero (schema + seed + migrations)."
  read -rp "Digite o nome do banco ($n) para confirmar: " ans
  [ "$ans" = "$n" ] || { echo "Cancelado."; return 0; }
  export PGPASSWORD="$(get_env DB_PASS)"
  local psql=(psql -v ON_ERROR_STOP=1 -h "$h" -p "$p" -U "$u" -d "$n")
  echo "==> Limpando schema public"
  "${psql[@]}" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' &&
    echo "==> schema.sql" && "${psql[@]}" -f "$TW26_DIR/backend/database/schema.sql" &&
    echo "==> seed.sql" && "${psql[@]}" -f "$TW26_DIR/backend/database/seed.sql" &&
    echo "==> migrations (registra o controle)" && php "$TW26_DIR/backend/bin/migrate.php"
}
act_admin()    { php "$TW26_DIR/backend/bin/make-admin.php"; }
act_backup()   { bash "$TW26_DIR/deploy/oci/backup-db.sh"; }
act_restore() {
  read -rp "Arquivo .sql.gz (vazio = backup mais recente): " f
  if [ -n "$f" ]; then bash "$TW26_DIR/deploy/oci/restore-local-db.sh" "$f"
  else bash "$TW26_DIR/deploy/oci/restore-local-db.sh"; fi
}
act_ssh()      { ssh techweek; }
act_git()      { git -C "$TW26_DIR" status; }

# ---------- itens: "ação|rótulo" (ação vazia = cabeçalho de grupo) ----------
ITEMS=(
  "|Desenvolvimento"
  "act_dev_all|tw-dev         back (:8080) + front juntos"
  "act_back|tw-back        só backend (php -S localhost:8080)"
  "act_front|tw-front       só frontend (npm start)"
  "|Frontend"
  "act_install|npm install"
  "act_lint|npm run lint"
  "act_build|npm run build"
  "act_deploy|npm run deploy (gh-pages)"
  "|Backend / Banco"
  "act_composer|composer install"
  "act_migrate|Rodar migrations (backend/bin/migrate.php)"
  "act_initdb|Recriar banco do zero (APAGA tudo: schema + seed)"
  "act_admin|Criar/atualizar admin inicial (ADMIN_EMAIL do .env)"
  "act_backup|tw-backup-db    baixa dump de produção (~/tw26-backups)"
  "act_restore|tw-restore-db   sobrescreve banco local com backup"
  "|Outros"
  "act_ssh|SSH na VM de produção (host 'techweek')"
  "act_git|git status"
  "quit|Sair"
)

sel=1   # primeiro item selecionável

next_sel() {  # $1 = +1 / -1; pula cabeçalhos, sem dar a volta
  local i=$((sel + $1))
  while ((i >= 0 && i < ${#ITEMS[@]})); do
    [ -n "${ITEMS[i]%%|*}" ] && { sel=$i; return; }
    i=$((i + $1))
  done
}

draw() {
  printf '\e[H\e[2J'
  echo "${C_TITLE}══════════ TechWeek 2026 — Menu ══════════${C_OFF}"
  echo "${C_DIM}↑/↓ navegar · Enter executar · q sair${C_OFF}"
  echo
  local i act label
  for i in "${!ITEMS[@]}"; do
    act="${ITEMS[i]%%|*}"; label="${ITEMS[i]#*|}"
    if [ -z "$act" ]; then
      echo " ${C_TITLE}${label}${C_OFF}"
    elif ((i == sel)); then
      echo "  ${C_SEL} ▶ ${label} ${C_OFF}"
    else
      echo "     ${label}"
    fi
  done
}

read_key() {
  local k rest
  IFS= read -rsn1 k || { KEY=quit; return; }
  case "$k" in
    $'\e')
      if IFS= read -rsn2 -t 0.1 rest; then
        case "$rest" in
          '[A') KEY=up ;; '[B') KEY=down ;; *) KEY=other ;;
        esac
      else KEY=quit; fi ;;
    '') KEY=enter ;;
    k) KEY=up ;; j) KEY=down ;; q|Q) KEY=quit ;;
    *) KEY=other ;;
  esac
}

cleanup() { printf '\e[?25h'; }
trap cleanup EXIT

while true; do
  printf '\e[?25l'
  draw
  read_key
  case "$KEY" in
    up)    next_sel -1 ;;
    down)  next_sel 1 ;;
    quit)  exit 0 ;;
    enter)
      act="${ITEMS[sel]%%|*}"
      [ "$act" = quit ] && exit 0
      printf '\e[?25h\e[H\e[2J'
      echo "${C_TITLE}▶ ${ITEMS[sel]#*|}${C_OFF}"; echo
      ( "$act" )
      echo
      read -rp "Enter para voltar ao menu..." _
      ;;
  esac
done
