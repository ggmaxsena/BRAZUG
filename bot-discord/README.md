# BRAZUG Discord Bot

Bot Discord de administração multi-guild para a plataforma BRAZUG.

## Funcionalidades

- **Comandos Admin**: banir, desbanir, conceder/revogar permissões
- **Agenda**: criar, listar e remover eventos
- **Vendas**: criar, listar e remover vendas
- **Anúncios**: postar anúncios em canais
- **Monitor Twitch**: notifica automaticamente quando streamers com tag "brazug" ficam online
- **Multi-guild**: funciona em múltiplos servidores com isolamento de dados

## Requisitos

- Node.js >= 18
- Conta Discord com bot criado
- Backend BRAZUG rodando com API admin configurada

## Instalação

```bash
cd bot-discord
npm install
```

## Configuração

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` com suas configurações:
   ```env
   DISCORD_BOT_TOKEN=token_do_seu_bot
   DISCORD_CLIENT_ID=client_id_do_seu_bot
   ADMIN_API_KEY=chave_do_backend
   ADMIN_API_BASE_URL=https://brazug.com/api/v1/admin
   TWITCH_TAG_TO_MONITOR=brazug
   ```

3. Inicie o bot:
   ```bash
   npm start
   ```

## Comandos

### Administração

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/setup` | Configurar o bot para o servidor | Admin do Discord |
| `/config` | Ver configurações da guild | Todos |
| `/ban <usuario> <motivo>` | Banir usuário | Guildmaster+ |
| `/unban <usuario>` | Desbanir usuário | Guildmaster+ |
| `/userinfo <username>` | Ver detalhes de usuário | Guildmaster+ |
| `/grant <usuario> <nivel>` | Conceder permissão | Master |
| `/revoke <usuario> <nivel>` | Revogar permissão | Master |

### Agenda

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/evento <titulo> <data> <hora>` | Criar evento | Events Admin+ |
| `/eventos` | Listar próximos eventos | Todos |
| `/evento-delete <id>` | Remover evento | Events Admin+ |

### Vendas

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/venda <item> <preco> <vendedor>` | Criar venda | Guildmaster+ |
| `/vendas` | Listar vendas ativas | Todos |
| `/venda-remove <id>` | Remover venda | Guildmaster+ |

### Anúncios

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/anuncio <mensagem>` | Postar anúncio | Events Admin+ |

### Informativos

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/stats` | Estatísticas da guild | Todos |
| `/audit [limite]` | Ver logs de auditoria | Core Admin+ |

## Níveis de Permissão

```
Master (Admin Master)
  └── Guildmaster
        └── Core Admin
              └── Events Admin
```

| Nível | Pode fazer |
|-------|-----------|
| **Master** | Tudo, incluindo gerenciar permissões |
| **Guildmaster** | Banir, aprovar aventuras, ver audit log |
| **Core Admin** | Gerenciar core, ver stats e audit |
| **Events Admin** | Criar eventos, postar anúncios, ver stats |

## Monitor Twitch

O bot verifica a cada 2 minutos se há streams ao vivo com a tag configurada (padrão: "brazug"). Quando uma stream fica online, ele envia uma notificação no canal de streams configurado.

### Configuração do canal de streams

Use `/setup` ou configure manualmente no backend:
```json
{
  "stream_channel_id": "ID_DO_CANAL"
}
```

## Multi-Guild

O bot suporta múltiplos servidores com isolamento completo de dados:

- Cada guild tem seus próprios eventos, vendas e anúncios
- Permissões são gerenciadas por guild
- Configurações independentes (canais, tags, etc.)

Para adicionar o bot a outro servidor, basta convidá-lo e usar `/setup`.

## Estrutura de Arquivos

```
bot-discord/
├── package.json
├── .env.example
├── src/
│   ├── index.js                  # Entry point
│   ├── commands/                 # Comandos slash
│   │   ├── setup.js
│   │   ├── config.js
│   │   ├── admin/                # Comandos de administração
│   │   ├── agenda/               # Comandos de agenda
│   │   ├── vendas/               # Comandos de vendas
│   │   ├── anuncios/             # Comandos de anúncios
│   │   └── info/                 # Comandos informativos
│   ├── monitors/                 # Monitores automáticos
│   │   └── twitch-monitor.js
│   ├── lib/                      # Bibliotecas
│   │   ├── api-client.js
│   │   ├── commands.js
│   │   ├── guild-config.js
│   │   ├── permissions.js
│   │   └── twitch.js
│   └── utils/                    # Utilitários
│       ├── embeds.js
│       └── format.js
└── README.md
```

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Bot não responde | Verifique se o token está correto e o bot está online |
| Comandos não aparecem | Aguarde 1 minuto após iniciar (registro pode demorar) |
| Erro 401 na API | Verifique se `ADMIN_API_KEY` está correta |
| Monitor Twitch não funciona | Verifique `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET` |

## Licença

Uso interno BRAZUG.
