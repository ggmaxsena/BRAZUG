"use strict";

const api = require("./api-client");

/**
 * Cache de configurações de guilds (evita chamadas repetidas à API)
 */
const guildCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega configuração da guild (com cache)
 */
async function getGuildConfig(guildId) {
  const cached = guildCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const result = await api.getGuild(guildId);
    const data = result.guild;
    guildCache.set(guildId, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    // Guild não registrada ainda
    return null;
  }
}

/**
 * Registra nova guild no backend
 */
async function registerGuild(guildId, guildName, guildIcon) {
  try {
    const result = await api.createGuild({
      guild_id: guildId,
      guild_name: guildName,
      guild_icon: guildIcon,
    });
    return result.guild;
  } catch (err) {
    console.error("[GuildConfig] Erro ao registrar guild:", err.message);
    return null;
  }
}

/**
 * Limpa o cache de uma guild
 */
function clearCache(guildId) {
  guildCache.delete(guildId);
}

module.exports = { getGuildConfig, registerGuild, clearCache };
