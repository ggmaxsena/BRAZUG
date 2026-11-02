"use strict";

const { EmbedBuilder } = require("discord.js");

const COLORS = {
  success: 0x00ff00,
  error: 0xff0000,
  info: 0x0099ff,
  warning: 0xffaa00,
  twitch: 0x9146ff,
};

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(title, fields = []) {
  const builder = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(title)
    .setTimestamp();
  // Aceita array de campos OU mensagem simples em string (ex: "Nenhum evento agendado")
  if (typeof fields === "string") {
    builder.setDescription(fields);
  } else if (Array.isArray(fields) && fields.length > 0) {
    builder.addFields(fields);
  }
  return builder;
}

/**
 * Embed de stream no formato retornado pelo backend BRAZUG:
 * { login, displayName, title, viewers, url, thumbnailUrl, gameName }
 */
function streamOnlineEmbed(stream) {
  const truncate = (t, m = 250) => (t && t.length > m ? t.slice(0, m - 3) + "..." : t || "N/A");
  return new EmbedBuilder()
    .setColor(COLORS.twitch)
    .setTitle(`🔴 ${stream.displayName || stream.login} está AO VIVO!`)
    .setURL(stream.url || `https://www.twitch.tv/${stream.login}`)
    .addFields(
      { name: "🎮 Jogo", value: stream.gameName || "N/A", inline: true },
      { name: "👁️ Viewers", value: String(stream.viewers || 0), inline: true },
      { name: "📝 Título", value: truncate(stream.title) }
    )
    .setThumbnail(stream.thumbnailUrl || null)
    .setTimestamp();
}

module.exports = { successEmbed, errorEmbed, infoEmbed, streamOnlineEmbed, COLORS };
