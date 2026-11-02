# Fluxo de Autenticação — BRAZUG

> Como funciona cadastro, login, sessão e recuperação de senha no site.
> Atualizado em: 01/11/2026

---

## 1. Cadastro (somente pelo Discord)

O cadastro pelo site está desativado (`POST /api/auth/register` responde `410`).
O único caminho é o comando `/cadastro` no bot da guilda.

```
/cadastro usuario:seunome email:seu@email.com
```

Fluxo:

1. Bot valida usuário/e-mail e chama `POST /api/v1/admin/register` (autenticado por `X-API-Key`).
2. Backend cria a conta com senha temporária aleatória (ninguém a conhece) e vincula o Discord
   na tabela `accounts` (habilita "Entrar com Discord" futuramente).
3. Gera token de "definir senha" válido por **48h** e grava o hash em `verification_tokens`
   (`type = reset`), mantendo também o token legado em `users`.
4. O **link** é entregue em três canais:
   - resposta **efêmera** do bot (só quem executou o comando vê);
   - **DM** do bot (se as DMs estiverem abertas);
   - **e-mail** (`sendBotRegistrationEmail`) — a cópia de segurança.
5. Ao abrir o link (`/reset-password.html?token=...`), o usuário define a senha.
   Como o link prova a posse do e-mail, a conta é **ativada automaticamente**.

Também é possível configurar `SECURITY_EMAIL` no `.env` para receber uma cópia (BCC)
dos e-mails de cadastro para auditoria da liderança.

> O link é pessoal. Quem tiver o link pode definir a senha da conta.

---

## 2. Login

- `POST /api/auth/login` aceita **usuário ou e-mail** no campo `username`.
- Erros são genéricos ("E-mail ou senha incorretos") para não revelar se a conta existe.
- Limite: 8 tentativas / 15 min por IP.
- Hash bcrypt com custo 12 (rehash automático de hashes antigos).
- Conta não verificada recebe `403` com `needs_verification: true`.
- Conta banida (`role = banned`) é recusada em **todas** as rotas de login/sessão.

### Sessão

- Sessão em **cookie HttpOnly** `brazug_session` (7 dias), token aleatório com hash SHA-256
  na tabela `sessions`. Não há mais JWT no `localStorage`.
- `GET /api/auth/me` devolve o usuário da sessão.
- `POST /api/auth/logout` apaga a sessão e o cookie.
- O papel é revalidado no banco a cada requisição: banir um usuário derruba a sessão na hora.
- Compatibilidade: rotas que usavam `Authorization: Bearer <jwt>` continuam funcionando
  (o cookie é tentado primeiro; um `Bearer` válido é aceito como fallback).

---

## 3. Recuperação de senha

`POST /api/auth/forgot-password` (formulário em `/forgot-password.html`):

1. Resposta é sempre genérica (não revela se o e-mail existe).
2. Se a conta existir, gera token de **1 hora** (hash em `verification_tokens`).
3. Envia o link:
   - por **e-mail** (`sendResetPasswordEmail`);
   - por **DM no Discord**, se a conta tiver Discord vinculado (`lib/discord.cjs`).
4. `POST /api/auth/reset-password` consome o token (single-use), troca a senha e ativa a
   conta se ela ainda estiver pendente de verificação.

Se o usuário perder o link do `/cadastro` (48h), o caminho é `/forgot-password.html`:
o link novo chega no e-mail e na DM do Discord vinculado.

---

## 4. Papéis e proteção de páginas

| Papel | Acesso |
|-------|--------|
| `admin` | tudo (inclui `/admin.html` e `/admin-core.html`) |
| `guildmaster`, `officer` | staff (`/admin-core.html`) |
| `guildmember` | perfil, personagens, cadastro de aventura |
| `banned` | nenhum (sessão recusada) |

- `js/auth-guard.js` valida via `GET /api/auth/me` antes de liberar páginas restritas.
- O backend valida em toda rota (`auth.authMiddleware` + `auth.requireRole`).

---

## 5. Variáveis de ambiente relevantes

| Variável | Uso |
|----------|-----|
| `BASE_URL` | base dos links de e-mail/Discord (ex.: `https://brazug.com`) |
| `JWT_SECRET` | assinatura dos tokens Bearer legados (fallback: `ADMIN_SECRET`) |
| `DISCORD_BOT_TOKEN` | enviar DMs de recuperação pelo bot |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | "Entrar com Discord" (precisa dos dois) |
| `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET` | "Entrar com Battle.net" |
| `SECURITY_EMAIL` | cópia BCC dos e-mails de cadastro (opcional) |
| `SMTP_*` | envio de e-mails |

---

## 6. Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/login` | login (usuário ou e-mail) |
| `GET` | `/api/auth/me` | usuário da sessão |
| `POST` | `/api/auth/logout` | encerra sessão |
| `GET` | `/api/auth/providers` | provedores OAuth habilitados |
| `GET` | `/api/auth/discord` | inicia OAuth Discord |
| `GET` | `/api/auth/battlenet` | inicia OAuth Battle.net |
| `POST` | `/api/auth/forgot-password` | pede link de nova senha |
| `POST` | `/api/auth/reset-password` | define nova senha (ativa a conta) |
| `POST` | `/api/auth/resend-verification` | reenvia ativação |
| `POST` | `/api/v1/admin/register` | cria conta (bot `/cadastro`) — retorna `setup_url` |
