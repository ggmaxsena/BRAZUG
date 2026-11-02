"use strict";

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./db.cjs");

let ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";
let ADMIN_API_KEY_HEADER = process.env.ADMIN_API_KEY_NAME || "X-API-Key";
let ADMIN_JWT_SCOPE = process.env.ADMIN_JWT_SCOPE || "admin";

/**
 * Recarrega as variáveis de ambiente (útil para testes)
 */
function reloadEnv() {
  ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";
  ADMIN_API_KEY_HEADER = process.env.ADMIN_API_KEY_NAME || "X-API-Key";
  ADMIN_JWT_SCOPE = process.env.ADMIN_JWT_SCOPE || "admin";
}

function getSecret() {
  return (
    process.env.ADMIN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "brazug-default-secret-key"
  );
}

/**
 * Valida a API key do header da requisição
 */
function validateApiKey(req) {
  reloadEnv();
  const key = req.headers[ADMIN_API_KEY_HEADER.toLowerCase()] || "";
  if (!key || !ADMIN_API_KEY) return false;
  return crypto.timingSafeEqual(
    Buffer.from(key.padEnd(64, "0")),
    Buffer.from(ADMIN_API_KEY.padEnd(64, "0"))
  );
}

/**
 * Valida JWT com escopo admin
 */
function validateAdminJwt(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getSecret());
    // Verifica se tem escopo admin
    if (decoded.scope !== ADMIN_JWT_SCOPE && decoded.r !== "admin") {
      return null;
    }
    return { id: decoded.id, username: decoded.u, role: decoded.r };
  } catch (e) {
    return null;
  }
}

/**
 * Middleware principal de autenticação admin
 * Tenta API key primeiro, depois JWT
 */
async function adminAuthMiddleware(req, res, next) {
  // 1. Tenta API key (para serviços externos: bot, CLI)
  if (validateApiKey(req)) {
    req.authType = "api_key";
    req.user = { id: null, username: "api-key", role: "admin" };
    return next();
  }

  // 2. Tenta JWT (para painel web)
  const jwtUser = validateAdminJwt(req);
  if (jwtUser) {
    req.authType = "jwt";
    req.user = jwtUser;
    return next();
  }

  // 3. Nenhum dos dois funcionou
  return res.status(401).json({
    error: "Não autorizado",
    message: `Forneça ${ADMIN_API_KEY_HEADER} válido ou token JWT com escopo admin`
  });
}

/**
 * Middleware de verificação de permissão
 * @param {string} permission - Permissão necessária (ex: 'user.ban', 'event.create')
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // API key tem acesso total
    if (req.authType === "api_key") {
      return next();
    }

    // JWT verifica permissão específica
    const PERMISSIONS = {
      "user.ban": ["admin"],
      "user.unban": ["admin"],
      "user.create": ["admin"],
      "user.delete": ["admin"],
      "adventure.approve": ["admin", "guildmaster"],
      "adventure.delete": ["admin", "guildmaster"],
      "event.create": ["admin", "guildmaster", "events.admin"],
      "event.delete": ["admin", "guildmaster", "events.admin"],
      "sale.create": ["admin", "guildmaster"],
      "sale.remove": ["admin", "guildmaster"],
      "announce": ["admin", "guildmaster", "core.admin", "events.admin"],
      "audit.read": ["admin", "guildmaster", "core.admin"],
      "settings.update": ["admin", "guildmaster"],
      "stats.read": ["admin", "guildmaster", "core.admin", "events.admin"],
      "admin.grant": ["admin"],
      "admin.revoke": ["admin"],
    };

    const allowedRoles = PERMISSIONS[permission] || ["admin"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Acesso negado",
        message: `Permissão '${permission}' necessária`
      });
    }

    next();
  };
}

/**
 * Registra log de auditoria no banco de dados
 */
async function auditLog(req, action, target, payload) {
  try {
    // O bot envia quem EXECUTOU o comando nos headers X-Actor-Id / X-Actor-Name.
    // Sem eles (CLI, chamadas diretas), cai para o usuário autenticado ou "api-key".
    const headerActorId = req.headers["x-actor-id"] || null;
    const headerActorName = req.headers["x-actor-name"]
      ? decodeURIComponent(String(req.headers["x-actor-name"]))
      : null;

    const adminId = headerActorId || req.user?.id || null;
    const adminUsername = headerActorName || req.user?.username || "api-key";
    const ip = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get("user-agent") || null;
    // guild_id vem na query (GET/DELETE) ou no body (POST/PUT)
    const guildId = req.query?.guild_id || req.body?.guild_id || req.guildId || null;

    await db.logGuildAudit({
      guild_id: guildId,
      admin_id: adminId,
      admin_username: adminUsername,
      action: action,
      target_type: target?.type || null,
      target_id: target?.id || null,
      payload: payload || {},
      ip_address: ip,
      user_agent: userAgent
    });
  } catch (err) {
    console.error("[AuditLog] Erro ao registrar:", err.message);
  }
}

/**
 * Extrai o IP real do cliente (considerando proxies)
 */
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || null;
}

module.exports = {
  adminAuthMiddleware,
  requirePermission,
  auditLog,
  validateApiKey,
  validateAdminJwt,
  getClientIp,
  ADMIN_API_KEY,
  ADMIN_API_KEY_HEADER
};
