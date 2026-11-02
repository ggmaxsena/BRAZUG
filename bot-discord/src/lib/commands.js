"use strict";

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

/**
 * Registra todos os comandos slash no Discord.
 * - Com DISCORD_GUILD_ID: comandos do servidor (aparecem na hora). Usado no teste.
 * - Sem DISCORD_GUILD_ID: comandos globais (podem levar até 1h para aparecer). Usado em produção.
 */
async function registerCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, "..", "commands");

  // Lê todos os arquivos de comandos
  const loadCommands = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadCommands(fullPath);
      } else if (entry.name.endsWith(".js")) {
        const command = require(fullPath);
        if (command.data && command.execute) {
          commands.push(command.data.toJSON());
          client.commands.set(command.data.name, command);
        }
      }
    }
  };

  loadCommands(commandsPath);

  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  try {
    if (guildId) {
      // Limpa os globais para não duplicar no menu, e registra no servidor de teste
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`[Bot] ${commands.length} comandos registrados no servidor ${guildId} (aparecem na hora).`);
    } else {
      console.log(`[Bot] Registrando ${commands.length} comandos globais...`);
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`[Bot] ${commands.length} comandos globais registrados (podem levar até 1h).`);
    }
  } catch (err) {
    console.error("[Bot] Erro ao registrar comandos:", err);
  }
}

module.exports = { registerCommands };
