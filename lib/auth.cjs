"use strict";

const crypto = require("crypto");

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminSecret() {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    ""
  );
}

function createToken() {
  const secret = getAdminSecret();
  if (!secret) throw new Error("ADMIN_SECRET não configurado no servidor");

  const issued = Date.now().toString();
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = issued + ":" + nonce;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return payload + "." + sig;
}

function verifyToken(token) {
  const secret = getAdminSecret();
  if (!secret || !token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const payload = parts[0];
  const sig = parts[1];
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (sig !== expected) return false;

  const issued = Number(payload.split(":")[0]);
  if (!issued || Date.now() - issued > MAX_AGE_MS) return false;

  return true;
}

function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  return password === expected;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyToken(token)) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  next();
}

module.exports = {
  createToken,
  verifyToken,
  checkPassword,
  authMiddleware,
  getAdminSecret,
};
