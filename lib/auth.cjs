"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "brazug-default-secret-key"
  );
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compareSync(password, hash);
}

function createToken(user) {
  const secret = getSecret();
  const issued = Date.now().toString();
  const nonce = crypto.randomBytes(12).toString("hex");
  
  const payload = Buffer.from(JSON.stringify({
    u: user.username,
    r: user.role,
    id: user.id, // Adicionado ID
    i: issued,
    n: nonce
  })).toString("base64");

  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return payload + "." + sig;
}

function verifyToken(token) {
  const secret = getSecret();
  if (!secret || !token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const payloadBase64 = parts[0];
  const sig = parts[1];
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("hex");

  if (sig !== expected) return null;

  try {
    const data = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
    
    if (!data.i || Date.now() - Number(data.i) > MAX_AGE_MS) {
      return null;
    }

    return {
      username: data.u,
      role: data.r,
      id: data.id // Adicionado ID
    };
  } catch (e) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = verifyToken(token);
  
  if (!user) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  req.user = user;
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // O Admin sempre tem permissão para tudo
    if (req.user.role === "admin") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado: permissão insuficiente" });
    }

    next();
  };
}

module.exports = {
  createToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authMiddleware,
  requireRole,
  getAdminSecret: getSecret, // Alias for backward compatibility if needed
};
