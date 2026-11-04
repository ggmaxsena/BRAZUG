"use strict";

const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const db = require("./db.cjs");
const auth = require("./auth.cjs");
const email = require("./email.cjs");

const GENERIC_LOGIN_ERROR = "E-mail ou senha incorretos";
const GENERIC_RESET_MESSAGE = "Se o e-mail existir, um link de recuperação será enviado.";

function wantsApiToken(req) {
  return req.get("x-return-token") === "1";
}

function authPayload(req, user) {
  const body = { user: auth.publicUser(user) };
  if (wantsApiToken(req)) {
    body.token = auth.createToken(user);
  }
  return body;
}

async function establishSession(req, res, user) {
  // Chokepoint central: conta banida não ganha sessão em NENHUMA rota de login
  if (user && user.role === "banned") {
    const err = new Error("Esta conta foi suspensa.");
    err.code = "BANNED";
    throw err;
  }
  const raw = await auth.createSession(req, user);
  auth.setSessionCookie(res, req, raw);
}

function createAuthRouter() {
  const router = express.Router();

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false
  });

  router.get("/me", async function (req, res) {
    try {
      const user = await auth.resolveRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      res.json({ user: auth.publicUser(user) });
    } catch (e) {
      res.status(401).json({ error: "Não autorizado" });
    }
  });

  router.post("/logout", async function (req, res) {
    try {
      const raw = auth.readCookie(req, auth.SESSION_COOKIE);
      if (raw) await db.deleteSession(auth.hashToken(raw));
    } catch (e) {}
    auth.clearSessionCookie(res, req);
    res.json({ ok: true });
  });

  router.post("/login", authLimiter, async function (req, res) {
    const ident = String((req.body || {}).username || (req.body || {}).email || "").trim();
    const password = (req.body || {}).password;
    if (!ident || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    try {
      const user = ident.includes("@")
        ? await db.getUserByEmail(ident)
        : await db.getUserByUsername(ident);

      if (!user || !auth.comparePassword(password, user.password)) {
        return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
      }

      if (user.email && !user.is_verified) {
        return res.status(403).json({
          error: "Sua conta ainda não foi ativada.",
          needs_verification: true,
          email: user.email
        });
      }

      if (auth.needsRehash(user.password)) {
        await db.updateUserPassword(user.id, auth.hashPassword(password));
      }

      await establishSession(req, res, user);
      res.json(authPayload(req, user));
    } catch (e) {
      if (e && e.code === "BANNED") {
        return res.status(403).json({
          error: "Sua conta foi suspensa. Se acha que isso é um erro, fale com a liderança da guild.",
        });
      }
      console.error("[AUTH] login:", e.message);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/register", authLimiter, async function (req, res) {
    const { username, email: userEmail } = req.body || {};

    const validUsername = auth.validateUsername(username);
    const validEmail = auth.validateEmail(userEmail);
    if (!validUsername || !validEmail) {
      return res.status(400).json({
        error: "Nome de usuário inválido (3-32: letras minúsculas, números ou _) ou e-mail inválido."
      });
    }

    try {
      const existingUser = await db.getUserByUsername(validUsername);
      const existingEmail = await db.getUserByEmail(validEmail);
      if (existingUser || existingEmail) {
        return res.status(409).json({ error: "Este nome de usuário ou e-mail já está em uso." });
      }

      // A senha só é definida pelo dono do e-mail, no link enviado abaixo.
      // A senha temporária aleatória não é conhecida por ninguém.
      const tempPassword = crypto.randomBytes(24).toString("base64url");
      const newUser = await db.createUser({
        username: validUsername,
        email: validEmail,
        password: auth.hashPassword(tempPassword),
        role: "guildmember"
      });

      // Token de definição de senha (48h). O /reset-password ativa a conta
      // automaticamente ao concluir, pois o link prova a posse do e-mail.
      const setupToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await db.setResetToken(validEmail, setupToken, expires);
      await db.createAuthToken({
        userId: newUser.id,
        tokenHash: auth.hashToken(setupToken),
        type: "reset",
        expiresAt: expires
      });

      email.sendAccountSetupEmail(validEmail, validUsername, setupToken).catch(err => {
        console.error("[BRAZUG] Falha ao enviar e-mail de definição de senha:", err.message);
      });

      res.status(201).json({
        ok: true,
        message: "Conta criada! Enviamos um link para o seu e-mail para definir sua senha."
      });
    } catch (e) {
      console.error("[AUTH] register:", e.message);
      res.status(400).json({ error: "Não foi possível criar a conta. Verifique os dados informados." });
    }
  });

  router.get("/verify", async function (req, res) {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token ausente");

    try {
      const userId = await db.consumeAuthToken(auth.hashToken(token), "verify");
      let user = null;
      if (userId) {
        user = await db.updateUser(userId, { is_verified: true, verification_token: null });
      } else {
        user = await db.verifyUser(token);
      }
      if (!user) return res.status(400).send("Token inválido ou expirado");

      res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #000; color: #fff; height: 100vh;">
            <h1 style="color: #f7b500;">Conta Ativada!</h1>
            <p>Sua conta foi verificada com sucesso. Agora você pode entrar no sistema.</p>
            <a href="/login.html" style="color: #f7b500; text-decoration: none; font-weight: bold;">Ir para o Login</a>
        </div>
      `);
    } catch (e) {
      res.status(500).send("Erro interno");
    }
  });

  router.post("/forgot-password", authLimiter, async function (req, res) {
    const userEmail = auth.validateEmail((req.body || {}).email);
    if (!userEmail) return res.status(400).json({ error: "E-mail é obrigatório" });

    try {
      const user = await db.getUserByEmail(userEmail);
      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await db.setResetToken(userEmail, resetToken, expires);
        await db.createAuthToken({
          userId: user.id,
          tokenHash: auth.hashToken(resetToken),
          type: "reset",
          expiresAt: expires
        });
        email.sendResetPasswordEmail(userEmail, user.username, resetToken).catch(err => {
          console.error("[BRAZUG] Falha ao enviar e-mail de recuperação:", err.message);
        });
      }
      res.json({ ok: true, message: GENERIC_RESET_MESSAGE });
    } catch (e) {
      console.error("[AUTH] forgot:", e.message);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/reset-password", authLimiter, async function (req, res) {
    const { token, password } = req.body || {};
    const passwordError = auth.validatePassword(password);
    if (!token || passwordError) {
      return res.status(400).json({ error: passwordError || "Dados incompletos" });
    }

    try {
      const userId = await db.consumeAuthToken(auth.hashToken(token), "reset");
      const legacy = userId ? null : await db.getUserByResetToken(token);
      const targetId = userId || (legacy && legacy.id);
      if (!targetId) return res.status(400).json({ error: "Token inválido ou expirado" });

      await db.updateUserPassword(targetId, auth.hashPassword(password));
      await db.resetPassword(token, auth.hashPassword(password));

      // Se o usuário ainda está pendente de verificação, definir a senha pelo link do
      // e-mail já prova a posse do e-mail: ativamos a conta automaticamente.
      try {
        const current = await db.getUserById(targetId);
        if (current && !current.is_verified) {
          await db.updateUser(targetId, { is_verified: true, verification_token: null });
        }
      } catch (e) {
        console.error("[AUTH] auto-verify after reset:", e.message);
      }

      res.json({ ok: true, message: "Senha alterada com sucesso!" });
    } catch (e) {
      console.error("[AUTH] reset:", e.message);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/resend-verification", authLimiter, async function (req, res) {
    const userEmail = auth.validateEmail((req.body || {}).email);
    if (!userEmail) return res.status(400).json({ error: "E-mail é obrigatório" });

    try {
      const user = await db.getUserByEmail(userEmail);
      if (user && !user.is_verified) {
        const setupToken = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await db.setResetToken(userEmail, setupToken, expires);
        await db.createAuthToken({
          userId: user.id,
          tokenHash: auth.hashToken(setupToken),
          type: "reset",
          expiresAt: expires
        });
        email.sendAccountSetupEmail(userEmail, user.username, setupToken).catch(err => {
          console.error("[BRAZUG] Falha ao reenviar e-mail de definição de senha:", err.message);
        });
      }
      res.json({ ok: true, message: "Se o e-mail estiver cadastrado e pendente, o link para definir a senha foi reenviado." });
    } catch (e) {
      console.error("[AUTH] resend:", e.message);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // Rotas de auth desconhecidas (inclui as antigas /api/auth/discord e /api/auth/battlenet) retornam 404
  // em vez de cair no router genérico de /api.
  router.use(function (req, res) {
    res.status(404).json({ error: "Rota de autenticação não encontrada" });
  });

  return router;
}

module.exports = { createAuthRouter };
