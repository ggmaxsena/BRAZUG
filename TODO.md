# BRAZUG — Backlog & TODO List

Este documento lista as melhorias planejadas, bugs conhecidos e ideias para o futuro do projeto BRAZUG.

## 🟢 Prioridade Alta (Curto Prazo)

- [ ] **Estabilizar Armory**: Garantir que a sincronização com a API da Blizzard esteja 100% funcional.
    - [ ] Validar credenciais da Blizzard no ambiente de produção.
    - [ ] Corrigir erros de "Namespace" na busca de personagens (Classic vs Retail).
    - [ ] Garantir que o `SyncButton.tsx` no Next.js atualize corretamente o banco de dados principal.
- [ ] **Sistema de Notificações**: Feedback visual mais claro ao salvar aventuras ou personagens (atualmente usa `alert`).
- [ ] **Melhoria no Upload**: Adicionar compressão de imagem no frontend antes do upload para economizar espaço em disco na VPS.
- [ ] **Filtros no Mural**: Adicionar filtros por categoria (RP, Incursão, Morte Heroica) no mural da página inicial.
- [ ] **SEO & Meta Tags**: Otimizar o compartilhamento de links de aventuras (OpenGraph tags dinâmicas).

## 🟡 Prioridade Média (Médio Prazo)

- [ ] **Comentários nas Aventuras**: Permitir que membros logados deixem comentários ou "reações" (honra) nas histórias do mural.
- [ ] **Integração Discord**: Webhook para avisar automaticamente no canal da guilda quando uma nova aventura for publicada.
- [ ] **Dashboard Estatístico**: Gráficos no painel administrativo mostrando crescimento de membros e atividade do mural.
- [ ] **Sistema de Conquistas (RP)**: Atribuir medalhas manuais nos perfis para destacar feitos lendários.
- [ ] **Simulador de Set BiS / Planejador**: Criar interface para montar sets de itens (ex: "Set BiS Lvl 30") e simular como ficarão os atributos finais do personagem.

## 🔵 Prioridade Baixa (Longo Prazo / Roadmap)

- [ ] **Fórum Interno**: Um espaço simplificado para discussão de estratégias e RP persistente.
- [ ] **Refatoração para Next.js**: Migrar o site "Stable" para o mesmo ecossistema do Armory para unificar o código.
- [ ] **App Mobile (PWA)**: Transformar o site em um Progressive Web App para melhor acesso via celular.
- [ ] **Sistema de Eventos**: Calendário interativo onde membros podem confirmar presença em eventos de RP ou Raids.

## 🐞 Bugs & Ajustes Técnicos

- [ ] **Validar E-mails**: Implementar regex mais rigorosa no registro.
- [ ] **Rate Limiting**: Adicionar limite de requisições nas rotas de login/register para evitar força bruta.
- [ ] **Logs de Auditoria**: Registrar quem deletou ou editou aventuras no banco de dados.
- [ ] **Cache de Armory**: Implementar Redis ou cache em memória para evitar hits excessivos na API da Blizzard.

---
*Atualizado em: 29 de Maio de 2026*
