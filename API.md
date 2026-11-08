# BRAZUG — API Reference

A API do BRAZUG é dividida em namespaces para facilitar o gerenciamento de permissões.

## 1. Endpoints Públicos (`/api`)

### `GET /api/health`
Verifica a saúde do sistema.
- **Resposta**: JSON com status do Postgres e do filesystem.

### `GET /api/adventures`
Lista as aventuras publicadas.
- **Resposta**: `{ adventures: [...] }`

### `GET /api/live-streams`
Lista membros da guilda ao vivo na Twitch.
- **Resposta**: `{ streams: [...], tag: "<BRAZUG>" }`
- Canais bloqueados ficam de fora. A blacklist é editada no admin (Configurações → Blacklist de streams) e salva em `site_settings` com a chave `stream_blacklist` (um link ou login por linha).
- Canais monitorados são verificados diretamente na Twitch, mesmo fora das categorias de WoW ou com poucos espectadores. A lista fica em `site_settings` com a chave `stream_channels` e também inclui automaticamente os `twitch_url` dos personagens cadastrados.

### `GET /api/forever/guilds`
Dados públicos das guildas BRAZUG e BRAZUG II no World of Warcraft: Forever (Battle.net API).
- **Resposta**: `{ guilds: [...], totals: { guilds, members, maxLevel, avgLevel }, updatedAt }`
- Cache em memória de 5 minutos; usa as credenciais `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET` e o namespace `profile-forever-{BLIZZARD_REGION}`.

---

## 2. Autenticação (`/api/auth`)

### `POST /api/auth/register`
Cria a conta e envia ao e-mail cadastrado o link para definir a senha.
- **Body**: `{ username, email }`

### `POST /api/auth/login`
Autentica e cria a sessão em cookie HttpOnly.
- **Body**: `{ username, password }`

### `GET /api/auth/me`
Retorna o usuário da sessão atual.

### `POST /api/auth/logout`
Encerra a sessão e apaga o cookie.

### `POST /api/auth/forgot-password`
Envia um link de recuperação para o e-mail cadastrado.
- **Body**: `{ email }`

### `POST /api/auth/reset-password`
Define uma nova senha e ativa a conta, se necessário.
- **Body**: `{ token, password }`

---

## 3. Administração (`/api/admin`)
*Requer sessão autenticada (cookie) ou token JWT no header Authorization.*

### `GET /api/admin/analytics`
Dashboard consolidado: KPIs, cadastros por mês, classes, raças, níveis, mortes, aventuras e COREs.

### `GET /api/admin/characters`
Lista personagens com classe, raça, nível, guilda, reino, dono e status.
- **Query**: `search` (opcional), `limit` (opcional).

### `GET /api/admin/reports/players.csv`
Exporta o relatório de jogadores cadastrados em CSV.

### `GET /api/admin/reports/characters.csv`
Exporta o relatório de personagens em CSV.

### `GET /api/admin/reports/classes.csv`
Exporta o resumo agregado por classe em CSV.

### `GET /api/admin/reports/adventures.csv`
Exporta as aventuras com autor, status e datas em CSV.

### `GET /api/admin/reports/cores.csv`
Exporta as inscrições CORE com status e respostas em CSV.

### `GET /api/admin/adventures`
Lista todas as aventuras para o painel administrativo.

### `POST /api/admin/adventures`
Cria uma nova aventura.
- **Permissão**: Admin, Guildmaster, Officer.

### `POST /api/admin/upload`
Faz upload de uma imagem. Retorna a URL relativa.
- **Form-data**: `image` (file).

---

## 4. Personagens (`/api/characters`)

### `GET /api/characters`
Lista personagens públicos.

### `POST /api/characters`
*Autenticado*. Cria um novo personagem vinculado ao usuário.

### `PUT /api/characters/:id`
*Autenticado*. Atualiza dados do personagem (apenas proprietário ou admin).

---

## 5. Armory

O Armory é um serviço separado (Next.js) em `brazug-armory/`. O site não expõe mais
endpoints de proxy do Armory.
