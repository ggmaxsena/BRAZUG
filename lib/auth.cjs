"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db.cjs");

const SESSION_COOKIE = "brazug_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

function getSecret() {
  return (
    process.env.ADMIN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "brazug-default-secret-key"
  );
}

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function comparePassword(password, hash) {
  if (!password || !hash) return false;
  try {
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return false;
  }
}

function needsRehash(hash) {
  try {
    return bcrypt.getRounds(hash) < BCRYPT_ROUNDS;
  } catch (e) {
    return false;
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return "A senha deve ter entre 8 e 128 caracteres.";
  }
  return null;
}

function validateEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
    return null;
  }
  return value;
}

function validateUsername(username) {
  const value = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(value)) return null;
  return value;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function createToken(user) {
  return jwt.sign(
    { u: user.username, r: user.role, id: user.id },
    getSecret(),
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  if (token === "session" || token === "null" || token === "undefined") return null;
  try {
    const decoded = jwt.verify(token, getSecret());
    return { username: decoded.u, role: decoded.r, id: decoded.id };
  } catch (e) {
    return null;
  }
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  const parts = raw.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}

function isSecureRequest(req) {
  if (req.secure) return true;
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return proto === "https";
}

function appendSetCookie(res, value) {
  const prev = res.getHeader("Set-Cookie");
  if (!prev) res.setHeader("Set-Cookie", value);
  else if (Array.isArray(prev)) res.setHeader("Set-Cookie", prev.concat(value));
  else res.setHeader("Set-Cookie", [prev, value]);
}

function setSessionCookie(res, req, token) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  appendSetCookie(
    res,
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}${secure}`
  );
}

function clearSessionCookie(res, req) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  appendSetCookie(res, `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function setStateCookie(res, req, name, value, maxAgeSec) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  appendSetCookie(
    res,
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`
  );
}

async function createSession(req, user) {
  const raw = crypto.randomBytes(32).toString("hex");
  await db.createSession({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + MAX_AGE_MS),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || ""
  });
  return raw;
}

async function resolveRequestUser(req) {
  const raw = readCookie(req, SESSION_COOKIE);
  if (raw) {
    const sessionUser = await db.getUserBySessionToken(hashToken(raw));
    if (sessionUser) {
      // Banimento imediato: sessões de usuários banidos são recusadas
      if (sessionUser.role === "banned") return null;
      return { id: sessionUser.id, username: sessionUser.username, role: sessionUser.role };
    }
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const verified = verifyToken(token);
  if (!verified) return null;
  if (verified.role === "banned") return null;

  // Revalida o papel no banco: um ban emitido DEPOIS do token também derruba o acesso
  if (verified.id) {
    try {
      const fresh = await db.getUserById(verified.id);
      if (fresh) {
        if (fresh.role === "banned") return null;
        return { id: fresh.id, username: fresh.username, role: fresh.role };
      }
    } catch (e) {
      /* usuário deletado: mantém o payload do token (comportamento antigo) */
    }
  }

  return verified;
}

async function authMiddleware(req, res, next) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: "Não autorizado" });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autorizado" });
    if (req.user.role === "admin") return next();
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado: permissão insuficiente" });
    }
    next();
  };
}

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

module.exports = {
  createToken,
  verifyToken,
  hashPassword,
  comparePassword,
  needsRehash,
  validatePassword,
  validateEmail,
  validateUsername,
  hashToken,
  authMiddleware,
  requireRole,
  resolveRequestUser,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  readCookie,
  publicUser,
  getAdminSecret: getSecret,
  SESSION_COOKIE
};
