# BRAZUG Website

Website e painel administrativo para a guilda **BRAZUG**.

## Arquitetura

| Onde | O quê |
|------|--------|
| **VPS** | Só **PostgreSQL** (Docker) |
| **Hostinger** (ou local) | Site Node.js (`server.js`) |

O app conecta na VPS via `DATABASE_URL`.

---

## 1. PostgreSQL na VPS

### Na VPS

```bash
git clone <seu-repo> brazug-db
cd brazug-db
cp .env.db.example .env
# Edite .env → POSTGRES_PASSWORD forte
docker compose up -d
docker compose ps
```

Libere a porta **5432** só para o IP da Hostinger (recomendado):

```bash
ufw allow from IP_DA_HOSTINGER to any port 5432
ufw enable
```

Anote o **IP público da VPS**.

### Teste na VPS

```bash
docker compose exec db psql -U brazug -d brazug -c "SELECT 1"
```

---

## 2. Site na Hostinger (ou local)

No painel **Node.js → Environment variables** (ou `.env` local):

```env
DATABASE_URL=postgresql://brazug:SENHA@IP_DA_VPS:5432/brazug
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
ADMIN_PASSWORD=...
PORT=3000
```

Build: `npm install && npm run build`  
Start: `npm start`

- Site: `https://brazug.com`
- Health: `https://brazug.com/api/health` → `"postgres": { "ok": true }`

No primeiro boot é criado o usuário **admin** (`ADMIN_PASSWORD`).

---

## Desenvolvimento local

```bash
# Terminal 1 — banco (igual à VPS)
cp .env.db.example .env
docker compose up -d

# Terminal 2 — app
cp .env.example .env
# DATABASE_URL=postgresql://brazug:SENHA@localhost:5432/brazug
npm install
npm start
```

---

## Variáveis

### VPS (`.env` do compose)

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_USER` | Usuário (padrão `brazug`) |
| `POSTGRES_PASSWORD` | Senha (obrigatória) |
| `POSTGRES_DB` | Banco (padrão `brazug`) |
| `POSTGRES_PUBLISH` | Porta exposta (padrão `5432`) |

### App (Hostinger)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | `postgresql://...@IP_VPS:5432/brazug` |
| `ADMIN_PASSWORD` | Senha do admin inicial |
| `TWITCH_*` | API Twitch |

---

## Docker (opcional)

Só o banco usa Compose. A imagem `Dockerfile` é opcional se um dia quiser containerizar o app:

```bash
docker build -t brazug-web .
```

---

## Scripts

- `npm start` — app Node
- `npm run docker:up` — sobe Postgres na máquina atual
- `npm run docker:logs` — logs do Postgres
- `npm run docker:down` — para o Postgres

## API

- `GET /api/health`
- `GET /api/adventures`
- `GET /api/live-streams`
- Rotas em `/api/admin/*`
