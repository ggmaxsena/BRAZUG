# BRAZUG — API Reference

A API do BRAZUG é dividida em namespaces para facilitar o gerenciamento de permissões.

## 1. Endpoints Públicos (`/api`)

### `GET /api/health`
Verifica a saúde do sistema.
- **Resposta**: JSON com status do Postgres e serviço de Armory.

### `GET /api/adventures`
Lista as aventuras publicadas.
- **Query Params**: `shadow` (opcional) — chave secreta para ver rascunhos.
- **Resposta**: `{ adventures: [...] }`

### `GET /api/live-streams`
Lista membros da guilda ao vivo na Twitch.
- **Resposta**: `{ streams: [...], tag: "<BRAZUG>" }`

---

## 2. Autenticação (`/api/auth`)

### `POST /api/auth/register`
Registra um novo usuário.
- **Body**: `{ username, email, password }`

### `POST /api/auth/login`
Autentica e retorna um token JWT.
- **Body**: `{ username, password }`

---

## 3. Administração (`/api/admin`)
*Requer token JWT no header Authorization.*

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

## 5. Armory Integration

### `GET /api/armory/full/:realm/:name`
Retorna dados completos do personagem (Blizzard + Perfil local).

### `GET /api/character/fetch/:realm/:name`
Proxy para buscar dados brutos da Blizzard via serviço Armory.
