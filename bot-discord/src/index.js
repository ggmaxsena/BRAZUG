"use strict";

require("dotenv").config();
const { Client, GatewayIntentBits, Collection, MessageFlags } = require("discord.js");
const { startTwitchMonitor } = require("./monitors/twitch-monitor");
const { registerCommands } = require("./lib/commands");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.commands = new Collection();

client.once("ready", async () => {
  console.log(`[Bot] Online como ${client.user.tag}`);
  console.log(`[Bot] Servidores: ${client.guilds.cache.size}`);

  // Registra comandos slash
  await registerCommands(client);

  // Inicia monitor Twitch
  startTwitchMonitor(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return safeRespond(interaction, {
      content: "❌ Comando não encontrado.",
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    // Informa ao api-client quem executou o comando (rastreabilidade no audit log)
    require("./lib/api-client").setActor(interaction.user);
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Bot] Erro no comando ${interaction.commandName}:`, err?.message || err);
    await safeRespond(interaction, {
      content: `❌ Erro ao executar o comando: ${err?.message || "desconhecido"}`,
      flags: MessageFlags.Ephemeral
    });
  }
});

/**
 * Responde sem nunca lançar erro não tratado (evita crash do processo)
 */
async function safeRespond(interaction, payload) {
  try {
    if (interaction.deferred) return await interaction.editReply(payload);
    if (interaction.replied) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch (e) {
    console.error("[Bot] Falha ao responder interação:", e?.message || e);
  }
}

client.on("guildCreate", async (guild) => {
  console.log(`[Bot] Adicionado ao servidor: ${guild.name} (${guild.id})`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
