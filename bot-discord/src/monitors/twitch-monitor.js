"use strict";

const { getLiveStreams, detectNewOnline, hasBaseline } = require("../lib/twitch");
const { getGuildConfig } = require("../lib/guild-config");

/**
 * Verifica streams ao vivo consultando o backend BRAZUG (sem credenciais Twitch aqui).
 */
async function checkStreams(client) {
  try {
    const streams = await getLiveStreams();

    if (!hasBaseline()) {
      detectNewOnline(streams); // estabelece baseline sem notificar
      console.log(`[StreamMonitor] ${streams.length} streams ao vivo no momento (baseline).`);
      return;
    }

    const fresh = detectNewOnline(streams);
    for (const stream of fresh) {
      console.log(`[StreamMonitor] ${stream.displayName} ficou AO VIVO!`);
      await notifyStreamOnline(client, stream);
    }
  } catch (err) {
    console.error("[StreamMonitor] Erro ao verificar streams:", err.message);
  }
}

/**
 * Envia notificação para o canal de streams de cada guild configurada.
 */
async function notifyStreamOnline(client, stream) {
  const { streamOnlineEmbed } = require("../utils/embeds");

  for (const guild of client.guilds.cache.values()) {
    const guildConfig = await getGuildConfig(guild.id);
    if (!guildConfig || !guildConfig.stream_channel_id) continue;

    const channel = guild.channels.cache.get(guildConfig.stream_channel_id);
    if (!channel) continue;

    try {
      await channel.send({ embeds: [streamOnlineEmbed(stream)] });
    } catch (err) {
      console.error(`[StreamMonitor] Erro ao notificar em ${guild.name}:`, err.message);
    }
  }
}

/**
 * Inicia o monitor
 */
function startTwitchMonitor(client) {
  console.log("[StreamMonitor] Iniciando monitor (via API do site, sem chaves Twitch)...");

  checkStreams(client);

  const interval = (parseInt(process.env.STREAM_CHECK_INTERVAL_MINUTES) || 2) * 60 * 1000;
  setInterval(() => checkStreams(client), interval);
}

module.exports = { startTwitchMonitor };
