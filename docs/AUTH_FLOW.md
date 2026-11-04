# Fluxo de Autenticação — BRAZUG

> Como funciona cadastro, login, sessão e recuperação de senha no site.
> Atualizado em: 03/11/2026

---

## 1. Cadastro pelo site

O cadastro é feito em `/register.html`:

1. O usuário informa **usuário** e **e-mail**.
2. O backend valida os dados e impede usuário/e-mail duplicados.
3. A conta é criada como `guildmember`, ainda **não verificada** e com uma
   senha temporária aleatória que ninguém conhece.
4. O backend gera um token de definição de senha válido por **48h**
   (hash em `verification_tokens`) e envia o link por e-mail
   (`sendAccountSetupEmail`).
5. Ao abrir o link (`/reset-password.html?token=...`), o usuário define a própria
   senha. Como o link prova a posse do e-mail, a conta é ativada automaticamente.
6. Depois disso, o usuário entra normalmente em `/login.html`.

> A senha nunca é escolhida antes de confirmar o e-mail. Quem tiver acesso ao
> e-mail cadastrado é quem define a senha da conta.

> Contas antigas (inclusive as criadas pelo antigo fluxo do Discord) continuam
> válidas. Quem nunca chegou a definir uma senha pode usar **“Esqueci minha senha”**
> para receber um novo link no e-mail cadastrado.

---

## 2. Login

- `POST /api/auth/login` aceita **usuário ou e-mail** no campo `username`.
- Erros são genéricos ("E-mail ou senha incorretos") para não revelar se a conta existe.
- Limite: 8 tentativas / 15 min por IP.
- Hash bcrypt com custo 12 (rehash automático de hashes antigos).
- Conta não verificada recebe `403` com `needs_verification: true`.
- Conta banida (`role = banned`) é recusada em **todas** as rotas de login/sessão.

### Login social (opcional)

- **Battle.net** continua disponível via `GET /api/auth/battlenet`, desde que
  `BLIZZARD_CLIENT_ID` e `BLIZZARD_CLIENT_SECRET` estejam configurados.
- O login social **não cria conta nova**: só entra quem já tem conta com o mesmo
  e-mail (o vínculo é feito automaticamente no primeiro login).

### Sessão

- Sessão em **cookie HttpOnly** `brazug_session` (7 dias), token aleatório com hash SHA-256
  na tabela `sessions`. Não há JWT no `localStorage`.
- `GET /api/auth/me` devolve o usuário da sessão.
- `POST /api/auth/logout` apaga a sessão e o cookie.
- O papel é revalidado no banco a cada requisição: banir um usuário derruba a sessão na hora.
- Compatibilidade: rotas que usavam `Authorization: Bearer <jwt>` continuam funcionando
  (o cookie é tentado primeiro; um `Bearer` válido é aceito como fallback).

---

## 3. Recuperação de senha

`POST /api/auth/forgot-password` (formulário em `/forgot-password.html`):

1. A resposta é sempre genérica (não revela se o e-mail existe).
2. Se a conta existir, gera um token de **1 hora** (hash em `verification_tokens`).
3. Envia o link **somente por e-mail** (`sendResetPasswordEmail`).
4. `POST /api/auth/reset-password` consome o token (single-use), troca a senha e ativa
   a conta se ela ainda estiver pendente de verificação.

Se o usuário perder o link de ativação, o caminho é `/forgot-password.html`: o link
novo chega no e-mail cadastrado.

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
| `BASE_URL` | base dos links de e-mail (ex.: `https://brazug.com`) |
| `JWT_SECRET` | assinatura dos tokens Bearer legados (fallback: `ADMIN_SECRET`) |
| `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET` | "Entrar com Battle.net" (opcional) |
| `SMTP_*` | envio de e-mails |

---

## 6. Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/register` | cria conta e envia link para definir a senha |
| `GET` | `/api/auth/verify` | ativa a conta pelo token do e-mail |
| `POST` | `/api/auth/login` | login (usuário ou e-mail) |
| `GET` | `/api/auth/me` | usuário da sessão |
| `POST` | `/api/auth/logout` | encerra sessão |
| `GET` | `/api/auth/providers` | provedores OAuth habilitados |
| `GET` | `/api/auth/battlenet` | inicia OAuth Battle.net |
| `POST` | `/api/auth/forgot-password` | pede link de nova senha |
| `POST` | `/api/auth/reset-password` | define nova senha (ativa a conta) |
| `POST` | `/api/auth/resend-verification` | reenvia link de ativação/definição de senha |

---

## 7. Deploy e variáveis em produção

- O deploy em produção é feito pelo **Hostinger ao dar push na `main`** (integração
  Git do hPanel). O workflow `.github/workflows/deploy.yml` está falhando desde
  setembro/2026 (etapa SCP) e **não é o caminho usado** hoje.
- As variáveis de ambiente de produção ficam no **hPanel** (ou no `.env` do VPS),
  não vêm do workflow.
- Após alterar variáveis no servidor, reinicie o app Node para recarregar o `.env`.
