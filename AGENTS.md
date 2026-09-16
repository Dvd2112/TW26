# AGENTS.md — TechWeek 2026 (TW26)

> Guia de orientação para IAs e desenvolvedores. Leia antes de modificar qualquer código.

## 1. Visão geral

Site institucional + sistema de pré-inscrição da **TechWeek 2026** (evento de tecnologia em Dois Vizinhos, PR). Monorepo com duas aplicações independentes:

| Camada | Stack | Deploy |
|---|---|---|
| `frontend/` | React 19 + CRA (react-scripts), Ant Design 6, framer-motion, axios | GitHub Pages (`gh-pages`, base `/TW26/`) |
| `backend/` | PHP 8 procedural (sem framework), PostgreSQL (PDO), PHPMailer | Servidor próprio sob `https://techweek2026.com.br/backend/` |

- **Sem router no front**: navegação por **query params** (`?audience=participants`, `?page=register`, `?step=2`). NÃO instalar react-router sem discussão prévia.
- **Sem framework no back**: endpoints PHP soltos, um arquivo por rota, contrato JSON `{ success, message }`.

## 2. Estrutura do repositório

```
TW26/
├── AGENTS.md                  # este arquivo
├── README.md                  # vazio (candidato a preencher)
├── frontend/
│   ├── package.json           # homepage "/TW26", scripts start/build/test/lint/deploy
│   ├── build/                 # build CRA versionado no repo (usado pelo gh-pages)
│   ├── public/
│   │   ├── index.html         # template CRA (título desatualizado: "Patrocinio")
│   │   └── 404.html           # redirect para /TW26/ (truque SPA do GitHub Pages)
│   └── src/
│       ├── index.js           # entrypoint (StrictMode + createRoot)
│       ├── App.jsx            # "roteador" por query param → RegisterPage ou ParticipantsPage
│       ├── pages/             # PÁGINAS = orquestração + conteúdo (texto) como constantes
│       │   ├── HomePage.jsx          # hub das duas jornadas (?audience=...)
│       │   ├── SpeakersPage.jsx      # jornada palestrante
│       │   ├── ParticipantsPage.jsx  # jornada participante
│       │   └── RegisterPage.jsx      # wizard de pré-inscrição (?page=register)
│       ├── views/             # SEÇÕES genéricas dirigidas a props (reutilizáveis)
│       │   ├── Hero/ Vision/ Numbers/ Highlights/ Edition2026/
│       │   ├── PreSaveBanner/ Contact/ FooterSection/ Register/
│       │   ├── Tiers/ Sponsors/       # ⚠️ CÓDIGO MORTO — ninguém importa
│       ├── components/        # ÁTOMOS reutilizáveis
│       │   ├── NavBar/               # sticky, muda classe ao scroll >50px, menu mobile
│       │   ├── StatCard/             # <Statistic> antd + fade-in via useInView
│       │   └── SectionTitle/         # tag + título + subtítulo (+ divisor neon)
│       ├── styles/
│       │   ├── theme.js              # export { colors, antdTheme } p/ ConfigProvider
│       │   ├── global.css            # DESIGN TOKENS (:root), reset, fontes, utilitários
│       │   └── *.module.css          # CSS Modules — um por view/component
│       └── assets/            # logos TW26, tipografias locais (Anton, Inter, Corporation Games)
├── backend/
│   ├── composer.json          # única dependência: phpmailer/phpmailer ^6.9
│   ├── .env / .env.example    # DB_*, SMTP_*, MAIL_FROM*, APP_URL, ADMIN_EMAIL
│   ├── config/
│   │   ├── database.php       # getDbConnection() PDO singleton + getEnv()/_loadEnv()
│   │   └── mailer.php         # createMailer(), sendConfirmationEmail(), sendAdminNotification()
│   ├── api/
│   │   ├── register.php       # POST pré-inscrição (valida, insere, envia 2 e-mails)
│   │   ├── verify-email.php   # GET ?token=... confirma e-mail (retorna HTML, não JSON)
│   │   └── contact.php        # POST contato por audiência (usa mail() nativo)
│   └── database/
│       ├── schema.sql         # schema completo (9 tabelas)
│       ├── seed.sql           # popula permissions (4 papéis admin)
│       └── migrations/        # migrações incrementais numeradas (ex.: 002_email_verification.sql)
```

## 3. Comandos

### Frontend (rodar dentro de `frontend/`)
```bash
npm install          # ou yarn (existe yarn.lock E package-lock.json — npm é o usado nos scripts)
npm start            # dev server CRA (porta 3000; proxy p/ localhost:8080 no package.json)
npm run lint         # eslint (flat config)
npm run build        # build de produção em build/
npm run deploy       # predeploy(build) + gh-pages -d build
```

### Backend
```bash
cd backend && composer install                    # gera vendor/ (não versionado)
psql -U tw26 -d tw26 -f backend/database/schema.sql
psql -U tw26 -d tw26 -f backend/database/seed.sql
cp backend/.env.example backend/.env              # preencher credenciais
php -S localhost:8080 backend/router.php           # servidor local — router mapeia /TW26/backend/* (proxy do CRA p/ :8080)
```

**NÃO há testes automatizados nem typecheck** (JS puro, PHP sem PHPUnit). Verificação = `npm run lint` no front + revisão manual.

## 4. Design patterns — FRONTEND

### 4.1 Arquitetura em 3 camadas visuais (padrão central do projeto)
```
pages/  →  views/  →  components/
```
- **`pages/`** = composição + **conteúdo como constantes** no topo do arquivo (`navLinks`, `stats`, `highlights`, `timeline`...). Texto institucional vive AQUI, não nas views.
- **`views/`** = seções grandes de página, **genéricas e dirigidas a props** (ex.: `<Contact audience="speaker">`, `<Hero actions={[...]}>`). Uma view nunca importa outra view.
- **`components/`** = átomos (NavBar, StatCard, SectionTitle). Recebem props, zero lógica de negócio.

**Regra ao criar tela nova:** crie uma Page nova que compõe views existentes por props. Só crie view nova se a seção não existir. Só crie component se for átomo reutilizável.

### 4.2 Roteamento
- Feito em `App.jsx` lendo `URLSearchParams(window.location.search)` e trocando a página renderizada.
- Navegação entre jornadas: links `<a href="?audience=speakers">` (**full reload**, não SPA navigation).
- Wizard de registro: `Register.jsx` lê `?step=2`; etapa 1 persiste em `sessionStorage` (chave `'tw26_presave'`) e navega via `window.location.search = params.toString()`.

### 4.3 Estilização — CSS Modules + Design Tokens
- Cada view/component tem seu `X.module.css` em `src/styles/` importado como `import styles from '...'`.
- **Tokens globais em `global.css`** (`:root`): `--color-bg:#000000`, `--color-neon:#8a00c4`, `--color-green:#bf40ff` (⚠️ nome legado — na verdade é roxo/magenta), `--color-card:#0d0d0d`, `--section-padding:100px 24px`, `--max-width:1200px`, `--font-title:'Anton'`, `--font-body:'Inter'`.
- Utilitários globais: `.section-wrapper`, `.neon-divider`, `.tag-mono`. Breakpoint único: **768px**.
- Fontes: Google Fonts (Anton, Inter) + `@font-face` locais de `assets/TIPOGRAFIAS/`.
- Identidade visual: fundo preto, roxo neon `#8a00c4` como primária, títulos Anton em caixa alta.

### 4.4 Tema Ant Design
- `styles/theme.js` exporta `antdTheme` consumido por `<ConfigProvider>` em `App.jsx` (com locale `pt_BR`).
- Novos componentes antd devem ser estilizados preferencialmente via `theme.js` (`components: { ... }`); estilo inline direto só quando pontual (ver padrão atual em NavBar/PreSaveBanner).

### 4.5 Animações
- **framer-motion** com o padrão repetido em todo o projeto:
```jsx
<motion.X initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: n * 0.1 }}>
```
- `useInView(ref, { once: true, margin: '-80px' })` para reveals fora de `motion.*`.

### 4.6 Chamadas HTTP
- **axios direto nos componentes** (NÃO existe camada `services/`, `hooks/`, `context/` — criar uma é melhoria bem-vinda, mas mantenha consistência ao tocar código existente).
- Endpoints com **caminho relativo hardcoded** (front e back compartilham origem sob `/TW26/`):
  - `axios.post('/TW26/backend/api/register.php', {...})`
  - `axios.post('/TW26/backend/api/contact.php', { ...values, audience })`
- Erros: `err.response?.data?.message ?? 'mensagem fallback'` exibido via `message.error()` (antd). Loading via `useState` + prop `loading` do Button.

### 4.7 Formulários
- Sempre antd `Form` com `rules` (required, `type:'email'`, `min` para senha, validadores custom via `({ getFieldValue }) => ({ validator })`).
- Máscaras e validações de domínio (CPF) são helpers locais no arquivo (ex.: `formatCPF`/`validateCPF` em Register.jsx).

## 5. Design patterns — BACKEND

### 5.1 Estilo geral
PHP **procedural**, `declare(strict_types=1)` em todos os arquivos. Um arquivo = um endpoint = uma responsabilidade. Sem classes, sem rotas, sem DI.

### 5.2 Contrato de API
- Entrada: corpo JSON bruto (`file_get_contents('php://input')` + `json_decode`).
- Saída: sempre `header('Content-Type: application/json')` + `json_encode(['success' => bool, 'message' => string])`.
- Códigos: `200` ok, `201` criado, `204` OPTIONS, `400` JSON inválido, `405` método errado, `409` duplicado, `422` validação, `500` interno.
- Exceção: `verify-email.php` retorna **HTML completo** (página de status com card da marca).

### 5.3 Esqueleto canônico de endpoint (copiar deste padrão)
```php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
// 1) CORS allowlist (localhost:5173, techweek2026.com.br, dvd2112.github.io) + OPTIONS→204
// 2) Guarda de método (POST senão 405)
// 3) Parse + validação de JSON (senão 400)
// 4) Campos obrigatórios (senão 422)
// 5) Sanitização: htmlspecialchars(strip_tags(trim(...))) | filter_var(..., FILTER_VALIDATE_EMAIL)
// 6) Whitelists de valores (in_array/match) p/ enums vindos do form
// 7) require_once config/database.php (+ mailer.php se precisar)
// 8) PDO com prepared statements SEMPRE (nunca interpolar SQL)
// 9) try/catch → 500 com mensagem genérica; detalhe real só em error_log()
```

### 5.4 Infra compartilhada (`config/`)
- **`database.php`**: `getDbConnection(): PDO` — singleton via `static $pdo`; atributos fixos `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, `EMULATE_PREPARES=false`. `getEnv($key)` / `_loadEnv()` — parser próprio com `parse_ini_file` sobre `backend/.env`, falhando alto se faltar variável obrigatória.
- **`mailer.php`**: factory `createMailer(): PHPMailer` configurada 100% via `.env`. Funções de alto nível `sendConfirmationEmail($toEmail, $toName, $token)` e `sendAdminNotification(...)`. Templates de e-mail são heredocs HTML inline (table-layout, dark theme).
- Todos os arquivos de config protegem funções com `if (!function_exists('x')):` (permite require múltiplo).

### 5.5 Segurança (manter em qualquer mudança)
- Senhas: `password_hash(..., PASSWORD_BCRYPT)` (limite 72 bytes já tratado na validação).
- Tokens de e-mail: `bin2hex(random_bytes(32))` (64 hex), expiração 24h, single-use (NULL após uso).
- SQL: exclusivamente prepared statements.
- Saída: escapar tudo que volta para HTML/e-mail com `htmlspecialchars(ENT_QUOTES, 'UTF-8')`.
- Falha de e-mail NUNCA derruba o cadastro: try/catch + `error_log('[TW26] ...')`.
- Dados sensíveis mascarados em logs/notificações (CPF vira `123.***.***-00`).
- Nunca logar nem ecoar `$e->getMessage()` de DB/PDO para o usuário.

### 5.6 Fluxo de pré-inscrição (end-to-end)
```
Register.jsx step1 → sessionStorage('tw26_presave') → ?step=2
step2 → POST register.php → valida → INSERT users (+token 24h)
      → sendConfirmationEmail (link APP_URL/backend/api/verify-email.php?token=…)
      → sendAdminNotification
usuário clica link → verify-email.php → UPDATE users SET email_verified_at=NOW(), token=NULL
```
Tabelas `presaves`, `lotes`, `registrations`, `payments`, `activities`, `activity_enrollments`, `permissions`, `user_permissions` **já existem no schema mas ainda não têm endpoints** — é o roadmap natural do projeto (lotes/inscrições/pagamentos/atividades/RBAC).

## 6. Banco de dados (PostgreSQL)

- Convenções: `snake_case`, PK `SERIAL id`, timestamps `TIMESTAMPTZ DEFAULT NOW()`, FKs com `ON DELETE CASCADE` (ou `SET NULL` para referências opcionais tipo `granted_by`, `lote_id`).
- Enums como `TEXT + CHECK (...)` (ex.: `status IN ('pending','confirmed','cancelled')`).
- Snapshots: `payments.amount` guarda o preço do lote no momento do pagamento; `gateway_payload JSONB` guarda resposta bruta do gateway (auditoria).
- RBAC preparado: `permissions` (super_admin, content_admin, registration_admin, credentialer) ↔ `user_permissions` N:N com auditoria (`granted_by`, `granted_at`).
- Mudanças de schema: **sempre** via novo arquivo numerado em `database/migrations/` (idempotente, `BEGIN/COMMIT`, `IF NOT EXISTS`). `schema.sql` reflete o estado consolidado — atualizá-lo junto.

## 7. Convenções de código

- **Idioma**: todo texto de UI, mensagens de API, comentários e commits em **português (pt-BR)**.
- JSX: função default export por arquivo, mesmo nome da pasta (`NavBar/NavBar.jsx`).
- CSS Modules: BEM-lite (`.section`, `.inner`, `.title`, `.cta`), classes compostas via `styles.x`.
- ESLint flat config: regra extra `no-unused-vars` ignora identificadores iniciados por maiúscula/underscore.
- Commits (histórico atual): mensagens curtas em pt-BR, às vezes com prefixo conventional (`feat:`, `fix:`, `chore:`) — siga esse estilo.
- Branches: nomes descritivos em inglês/português (atual: `MailerRegisters`; principal: `main`).

## 8. Dívidas conhecidas (NÃO "consertar" sem pedir; considerar ao tocar arquivos próximos)

1. **Encoding quebrado (mojibake `?`)**: `HomePage.jsx` inteiro e trecho de `SpeakersPage.jsx` — texto original perdido, precisa reescrita humana.
2. **Validação de CPF comentada** tanto no front (`Register.jsx`) quanto no back (`register.php`) — desligamento deliberado durante desenvolvimento; reativar os dois juntos.
3. **Views mortas**: `Tiers/` e `Sponsors/` não são importadas por ninguém (restos da LP de patrocínio).
4. **`App.css` é lixo de template** (classes `.counter`, `.hero` do starter) — não referenciar; candidato a deletar.
5. **Título do `public/index.html`** ainda diz "TechWeek 2026 - Patrocinio".
6. **Endpoints hardcoded** `/TW26/backend/api/*.php` — migrar para variável (`REACT_APP_API_URL` ou instância axios) exigiria mudar front E CORS no back em conjunto.
7. `build/` versionado no repo (necessário pro fluxo gh-pages atual).
8. Assets com nomes contendo espaços e `Zone.Identifier` (artefatos Windows/WSL) — cuidado ao renomear/copiar.
9. `package.json` tem `proxy: http://localhost:8080`; em dev usar `php -S localhost:8080 backend/router.php` (o router resolve `/TW26/backend/*`, então o proxy funciona de fato — sem `/TW26` o CORS/preflight quebraria em produção).

## 9. Checklist antes de finalizar qualquer tarefa

- [ ] `npm run lint` passa em `frontend/`
- [ ] Nenhum texto novo em hardcode dentro de `views/` (conteúdo vai em `pages/`)
- [ ] Endpoint novo segue o esqueleto da seção 5.3 (CORS, guards, sanitização, prepared statements, contrato JSON)
- [ ] Mudança de schema gerou migration numerada + atualizou `schema.sql`
- [ ] Mensagens de erro não expõem detalhes internos (stack, SQL, paths)
- [ ] Testado o fluxo real de navegação por query params (`?audience=`, `?page=register`, `?step=`)
