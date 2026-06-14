"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
  // Usando campos curtos para economizar banda, mantendo o padrão anterior
  return jwt.sign(
    { 
      u: user.username,
      r: user.role,
      id: user.id 
    }, 
    secret, 
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  const secret = getSecret();
  if (!secret || !token || typeof token !== "string") return null;

  try {
    const decoded = jwt.verify(token, secret);
    // Mapeia de volta os campos curtos (u, r) para os nomes longos esperados pelo app
    return {
      username: decoded.u,
      role: decoded.r,
      id: decoded.id
    };
  } catch (e) {
    // Se o token estiver expirado ou a assinatura for inválida, retorna null
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
    console.log(`[AUTH DEBUG] User Role: ${req.user?.role}, Allowed Roles: ${JSON.stringify(allowedRoles)}`);
    if (!req.user) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // O Admin sempre tem permissão para tudo
    if (req.user.role === "admin") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[AUTH DEBUG] Access Denied: User role ${req.user.role} not in allowed list.`);
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
