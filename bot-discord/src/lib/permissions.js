"use strict";

// Mapeamento de cargos do Discord por NOME para níveis de permissão.
// Usa os cargos já existentes no servidor oficial da BRAZUG,
// funcionando em qualquer guild com os mesmos nomes de cargos.
const ROLE_MAP = {
  "Chefe Guerreiro": "master",        // Líder da guild — acesso total
  "Ancião": "guildmaster",            // Ancião — banir, vendas, settings, audit
  "Raid-Helper": "events.admin",      // Ajuda em eventos/raides
  "Core": "core.admin",               // (crie este cargo se quiser permissão de core)
};

// Permissões por ação
const PERMISSIONS = {
  "user.ban": ["master", "guildmaster"],
  "user.unban": ["master", "guildmaster"],
  "user.create": ["master", "guildmaster"],
  "user.delete": ["master"],
  "adventure.approve": ["master", "guildmaster", "events.admin"],
  "adventure.delete": ["master", "guildmaster"],
  "event.create": ["master", "guildmaster", "events.admin"],
  "event.delete": ["master", "guildmaster", "events.admin"],
  "sale.create": ["master", "guildmaster"],
  "sale.remove": ["master", "guildmaster"],
  "announce": ["master", "guildmaster", "core.admin", "events.admin"],
  "audit.read": ["master", "guildmaster", "core.admin"],
  "settings.update": ["master", "guildmaster"],
  "stats.read": ["master", "guildmaster", "core.admin", "events.admin"],
  "admin.grant": ["master"],
  "admin.revoke": ["master"],
  "user.read": ["master", "guildmaster", "core.admin", "events.admin"],
  "event.read": ["master", "guildmaster", "core.admin", "events.admin"],
  "sale.read": ["master", "guildmaster", "core.admin", "events.admin"],
  "announcement.read": ["master", "guildmaster", "core.admin", "events.admin"],
};

/**
 * Retorna o nível mais alto do usuário baseado nos cargos
 */
function getUserLevel(userRoles) {
  for (const [roleId, level] of Object.entries(ROLE_MAP)) {
    if (userRoles.includes(roleId)) {
      return level;
    }
  }
  return null;
}

/**
 * Verifica se o usuário tem permissão para uma ação
 * @param {string} action - Ação a verificar (ex: 'user.ban')
 * @param {Array} userRoles - Cargos do usuário no Discord
 * @returns {boolean}
 */
function hasPermission(action, userRoles) {
  const userLevel = getUserLevel(userRoles);
  if (!userLevel) return false;

  const allowedLevels = PERMISSIONS[action];
  if (!allowedLevels) return false;

  return allowedLevels.includes(userLevel);
}

module.exports = { hasPermission, getUserLevel, PERMISSIONS };
