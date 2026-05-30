# BRAZUG — Estrutura do Banco de Dados

O projeto utiliza PostgreSQL como banco de dados principal. A estrutura é gerenciada automaticamente via scripts de inicialização no `lib/db.cjs`.

## 1. Tabelas Principais (Public)

### `adventures`
Armazena as crônicas e histórias do mural.
- `id`: UUID (Primary Key)
- `title`: Título da aventura.
- `body`: Conteúdo em HTML (Quill Editor).
- `author`: Nome do autor ou personagem.
- `image_url`: Caminho para a imagem de capa.
- `event_date`: Data em que a aventura ocorreu.
- `published`: Booleano (exibido ou não no mural).
- `visibility`: `public` ou `private`.

### `users`
Contas de acesso ao painel administrativo e perfis.
- `id`: UUID (Primary Key)
- `username`: Nome de usuário único.
- `password`: Hash Bcrypt.
- `email`: E-mail único.
- `role`: `admin`, `guildmaster`, `officer`, `guildmember`.
- `is_verified`: Status de verificação de e-mail.

### `wow_characters`
Perfis de personagens criados pelos usuários.
- `id`: UUID (Primary Key)
- `user_id`: Referência ao proprietário (`users.id`).
- `name`: Nome do personagem.
- `realm`: Servidor (ex: `doomhowl`).
- `class`, `race`, `level`.
- `is_dead`: Status Hardcore (morto ou vivo).
- `death_cause`, `death_location`, `death_level`.
- `image_url`: Avatar do personagem.
- `lore`: História do personagem.

### `site_settings`
Configurações de par chave-valor.
- `key`: Identificador único (ex: `agenda_image`).
- `value`: Valor da configuração.

---

## 2. Tabelas Armory (Esquema `armory`)

Estas tabelas são povoadas pelo serviço de sincronização com a Blizzard.

### `Character`
Dados básicos do personagem.
- `name`, `realm`, `level`, `class`, `race`, `gender`, `faction`.
- `guild_name`, `achievement_points`.

### `CharacterItem`
Itens equipados.
- `slot`: Cabeça, Ombro, etc.
- `item_id`, `item_name`, `quality`, `item_level`.

### `CharacterProfession`
Profissões e níveis.
- `name`, `rank`, `is_primary`.

---

## 3. Sincronização

A sincronização ocorre de duas formas:
1.  **Sync On-Demand**: Quando um perfil é acessado e não existe no banco local.
2.  **Sync Manual**: Via botão no perfil do usuário.
3.  **Sync Batch**: Scripts em `./brazug-armory/scripts/` para atualização em massa.
