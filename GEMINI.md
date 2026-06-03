# BRAZUG — Technical Documentation & Guidelines

Este documento descreve a arquitetura, as convenções e o funcionamento técnico do ecossistema BRAZUG.

## 1. Visão Geral da Arquitetura

O projeto é dividido em dois sistemas com propósitos distintos:

1.  **Website (Stable)**: Focado no aspecto humano, **Roleplay (RP) e Lore**.
    - Responsável pela crônica da guilda, mural de aventuras, perfis biográficos dos heróis e interação comunitária.
    - O lugar onde a história do personagem ganha vida.
2.  **Armory (Next.js)**: Focado em **Mecânicas, Stats e Min-Max**.
    - Responsável pela sincronização técnica com a Blizzard, exibição de itens, árvores de talentos, perícias e análise de desempenho mecânico.
    - O lugar onde a eficiência e a build do personagem são detalhadas.

### Stack Tecnológica
- **Backend**: Node.js, Express.
- **Banco de Dados**: PostgreSQL.
- **Frontend**: Vanilla JS (Padrão MVC Manual), CSS moderno.
- **Autenticação**: JWT Customizado (HMAC-SHA256).

---

## 2. Banco de Dados (PostgreSQL)

O banco de dados utiliza um sistema de **Auto-Migração** no `lib/db.cjs`. Ao iniciar o servidor, ele verifica e cria/atualiza as tabelas necessárias.

### Esquema Principal (Public)

| Tabela | Descrição |
| :--- | :--- |
| `adventures` | Crônicas e histórias postadas no mural. |
| `users` | Contas de usuários (admin, officer, guildmember). |
| `wow_characters` | Perfis de personagens vinculados aos usuários. |
| `site_settings` | Configurações dinâmicas (ex: imagem da agenda). |

### Esquema Armory (armory)
Utilizado para dados brutos sincronizados da Blizzard.
- `Character`, `CharacterItem`, `CharacterProfession`, `CharacterStat`, etc.

---

## 3. API Reference

### Endpoints Públicos
- `GET /api/health`: Status do sistema e conexão com BD.
- `GET /api/adventures`: Lista aventuras publicadas. Aceita `?shadow=...` para ver rascunhos.
- `GET /api/live-streams`: Streams da guilda ativas na Twitch (tag `<BRAZUG>`).
- `GET /api/characters/search?name=...`: Busca rápida de personagem.

### Autenticação (`/api/auth`)
- `POST /register`: Registro de novos membros.
- `POST /login`: Login e obtenção de token JWT.
- `GET /verify?token=...`: Verificação de e-mail.
- `POST /forgot-password`: Solicita recuperação de senha.

## 7. Armory Module (Next.js) — Detalhes Técnicos Recentes

Recentemente, foram aplicadas correções críticas para garantir a estabilidade e a precisão dos dados do Classic WoW:

### Sincronização e Banco de Dados
- **Upsert de Itens**: Implementada a verificação na tabela mestre `armory."Item"` antes de salvar equipamentos do personagem. Isso evita erros de chave estrangeira (FK) e garante que ícones e qualidades sejam persistidos.
- **Case Insensitivity**: Todas as buscas de personagem (`CharacterService.getCharacter`) agora utilizam `mode: 'insensitive'` no Prisma. Isso permite que buscas por "nome", "NOME" ou "Nome" funcionem corretamente.
- **Guild Check**: A verificação de pertencimento à guilda BRAZUG agora ignora diferenças entre maiúsculas/minúsculas.

### Lógica de Talentos e Specs (Classic)
- **Cálculo de Build**: O sistema agora soma os **ranks** de cada talento (ex: 5 pontos em um talento contam como 5 na build), permitindo a exibição do formato clássico `31 / 20 / 0`.
- **Auto-Detecção de Spec**: Como o Classic não possui uma spec ativa fixa na API da Blizzard, o sistema identifica a árvore com maior pontuação e a define como a especialização principal para fins de exibição.

### Interface do Usuário (UI)
- **Expertise (Perícia)**: Adicionada aos atributos principais.
- **Profissões**: Nova seção lateral exibindo o progresso atual das profissões primárias e secundárias.


O frontend segue uma separação clara de responsabilidades:

1.  **Models (`js/models/`)**: Responsáveis exclusivamente por chamadas de rede e retorno de dados puros.
    - *Ex: `AdventureModel.fetchAll()`*
2.  **Views (`js/views/`)**: Manipulação de DOM e templates HTML (via Template Literals).
    - *Ex: `AdventureView.renderGrid(data, container)`*
3.  **Controllers (`js/controllers/`)**: Orquestram a lógica, chamam o Model para obter dados e a View para exibir.
    - *Ex: `HomeController.js` coordena o carregamento do mural e heróis.*

---

## 5. Convenções de Código

- **Surgical Edits**: Preferir alterações pontuais em vez de refatorar arquivos inteiros.
- **CommonJS**: O backend utiliza `require` e módulos `.cjs` para compatibilidade.
- **Segurança**: Nunca logar segredos ou tokens. Usar `db.cjs` para todas as interações com o banco.
- **Estilo**: Manter o uso de Vanilla JS e CSS puro para o Website Stable. Tailwind é reservado para o módulo Armory.

---

4. Fluxos de Trabalho Comuns

### Adicionando uma Nova Funcionalidade
1.  Defina o esquema no `init()` do `lib/db.cjs` (auto-migração).
2.  Adicione as funções de CRUD no `lib/db.cjs`.
3.  Crie as rotas em `lib/admin-routes.cjs` ou `lib/character-routes.cjs`.
4.  Implemente o Model, View e Controller correspondentes no frontend.

---

## 8. Auction House Reputation System

A reputação é calculada com base nas últimas 100 transações avaliadas realizadas pelo personagem.

- **Janela de Cálculo**: Últimas 100 transações avaliadas. A nova avaliação substitui a mais antiga.
- **Peso das Avaliações**: Avaliações negativas possuem impacto maior do que positivas, visando desencorajar práticas desonestas ou preços abusivos.
- **Eventos Ignorados**: Leilões cancelados, itens expirados e negociações sem avaliação não alteram a reputação.
- **Escala**: Pontuação convertida de 0 a 100.
- **Objetivo**: Incentivar a consistência e práticas honestas ao longo do tempo.

### Selos de Reputação
Baseado na pontuação final (0-100), o comerciante recebe um selo automático:

- **Mercador Duvidoso**: Desempenho insatisfatório, histórico de avaliações negativas ou poucas negociações bem-sucedidas.
- **Mercador da Horda**: Reputação estável, demonstrando compromisso com negociações justas.
- **Mercador Lendário**: Excelente histórico de avaliações, comerciantes mais confiáveis e reconhecidos.

