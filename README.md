# BRAZUG Website

Website e painel administrativo para a guilda **BRAZUG**.

## Visão geral

Este projeto é um site Node.js + Express que serve o conteúdo estático do site e oferece APIs para:

- exibir o mural de aventuras
- buscar lives do Twitch que mencionam `<BRAZUG>` no título
- publicar novas aventuras via painel admin
- fazer upload de imagens usadas nas aventuras

A interface principal é feita em HTML/CSS/JavaScript simples e o backend usa `Express` para servir a aplicação.

## Funcionalidades

- mural de aventuras com cards clicáveis e modal de detalhes
- player Spotify embutido na barra superior
- painel de administração protegido por senha
- upload de imagem para aventuras
- integração com Twitch para listar streams ao vivo
- persistência de aventuras e usuários em MongoDB Atlas (`MONGODB_URI` obrigatório)

## Estrutura do projeto

- `server.js` - servidor Express principal
- `package.json` - dependências e scripts
- `lib/` - lógica de backend e rotas
  - `db.cjs` - persistência em MongoDB Atlas
  - `admin-routes.cjs` - rotas de API administrativa
  - `auth.cjs` - autenticação de token admin
  - `twitch.cjs` - integração com Twitch
- `data/uploads/` - uploads de imagens das aventuras
- `js/` - scripts do frontend
- `css/` - estilos do site
- `index.html` - página principal
- `admin.html` - painel de administração

## Instalação

```bash
npm install
```

## Configuração



### Notas

- `MONGODB_URI` é obrigatório em produção (aventuras e usuários do admin).
- `ADMIN_PASSWORD` é necessário para acessar o painel admin em `admin.html`.

## Scripts úteis

- `npm run build` — valida os arquivos principais em busca de erros de sintaxe
- `npm start` — inicia o servidor Express
- `npm run dev` — mesmo que `npm start` neste projeto

## Uso

- Abra `http://localhost:3002` para ver o site principal
- Acesse `http://localhost:3002/admin.html` para entrar no painel administrativo

### Endpoints disponíveis

- `GET /api/adventures` — lista aventuras publicadas
- `GET /api/live-streams` — lista de streams do Twitch
- `POST /api/admin/login` — autentica admin
- `POST /api/admin/adventures` — cria nova aventura (autenticado)
- `PUT /api/admin/adventures/:id` — atualiza aventura existente
- `DELETE /api/admin/adventures/:id` — exclui aventura
- `POST /api/admin/upload` — upload de imagem para `data/uploads`

## Deploy

O projeto pode ser hospedado em qualquer serviço Node.js compatível. No Hostinger:

| Campo | Valor |
|--------|--------|
| Entry / Start | `server.js` |
| Root / Output | `.` |
| **Build** | `npm install && npm run build` |
| **Start** | `npm start` |

### Variáveis de ambiente (painel Hostinger)

| Nome | Obrigatório | Exemplo |
|------|-------------|---------|
| `MONGODB_URI` | Sim* | `mongodb+srv://user:senha@cluster0.xxx.mongodb.net/Brazug?...` |
| `MONGODB_URI_STANDARD` | Se SRV falhar | URI **Standard** do Atlas (`mongodb://...:27017,...`) |
| `MONGODB_DB` | Não | `Brazug` |
| `TWITCH_CLIENT_ID` | Sim (streams) | — |
| `TWITCH_CLIENT_SECRET` | Sim (streams) | — |
| `ADMIN_PASSWORD` | Recomendado | senha do admin inicial |

\* Ou só `MONGODB_URI_STANDARD` se preferir.

### Checklist Hostinger × Atlas

1. **Conexão recusada / ENOTFOUND** — Atlas → **Network Access** → `0.0.0.0/0`. Na Hostinger, use `MONGODB_URI_STANDARD` (`npm run mongo:standard-uri` no PC).
2. **Falha na autenticação** — Senha do usuário em **Database Access** (não a senha da conta Atlas). Caracteres especiais na senha devem ser URL-encoded na URI.
3. **Módulo não encontrado: mongodb** — Build deve rodar `npm install` (não só `npm run build`).
4. **Variável indefinida** — Salvar `MONGODB_URI` em **Implantações → Variáveis de ambiente** e reiniciar o app.

Teste: `GET /api/health` → `"mongo": { "ok": true }`.

## Observações

- A página principal usa JavaScript para carregar aventuras e streams dinamicamente.
- O `package.json` define `node >=18` e inclui `mongodb` nas dependências.
