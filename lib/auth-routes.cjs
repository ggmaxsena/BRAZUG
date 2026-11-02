"use strict";

const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const db = require("./db.cjs");
const auth = require("./auth.cjs");
const email = require("./email.cjs");
const discord = require("./discord.cjs");

const GENERIC_LOGIN_ERROR = "E-mail ou senha incorretos";
const GENERIC_REGISTER_ERROR = "Não foi possível criar a conta. Verifique os dados informados.";
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

function providerConfig() {
  return {
    discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    battlenet: !!(process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET)
  };
}

function redirectUri(path) {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function signState() {
  const nonce = crypto.randomBytes(16).toString("hex");
  const sig = crypto.createHmac("sha256", auth.getAdminSecret()).update(nonce).digest("hex");
  return `${nonce}.${sig}`;
}

function verifyState(value) {
  if (!value || !value.includes(".")) return false;
  const [nonce, sig] = value.split(".");
  const expected = crypto.createHmac("sha256", auth.getAdminSecret()).update(nonce).digest("hex");
  if (!sig || sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

async function loginFromProvider(req, res, provider, profile) {
  const existing = await db.getAccount(provider, profile.id);
  if (existing) {
    if (existing.role === "banned") return res.redirect("/login.html?error=banned");
    await establishSession(req, res, existing);
    return res.redirect("/perfil.html");
  }

  // Auto-cadastro via OAuth desativado: só entra quem criou conta via /cadastro (Discord)
  // ou quem já tinha conta com o mesmo e-mail (vincula na hora).
  let user = profile.email ? await db.getUserByEmail(profile.email) : null;

  if (!user) return res.redirect("/login.html?error=nocadastro");
  if (user.role === "banned") return res.redirect("/login.html?error=banned");
  await db.linkAccount({
    userId: user.id,
    provider,
    providerAccountId: profile.id,
    email: profile.email || null
  });
  await establishSession(req, res, user);
  return res.redirect("/perfil.html");
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

  router.get("/providers", function (req, res) {
    res.json(providerConfig());
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
    // Cadastro agora é exclusivo pelo Discord (/cadastro no bot)
    return res.status(410).json({
      error: "O cadastro é feito apenas pelo nosso Discord! Entre em brazug.com/discord e use o comando /cadastro."
    });
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

        // Cópia no Discord: se a conta tiver Discord vinculado, envia o mesmo
        // link por DM. Falha aqui não afeta a resposta (e-mail continua valendo).
        try {
          const discordId = await db.getAccountForUser(user.id, "discord");
          if (discordId) {
            const resetUrl = `${(process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/reset-password.html?token=${resetToken}`;
            discord.sendDirectMessage(
              discordId,
              `🔐 **Recuperação de senha — BRAZUG**\n\n` +
                `Recebemos um pedido para redefinir a senha da conta **${user.username}**.\n` +
                `Defina sua nova senha aqui (válido por 1 hora):\n${resetUrl}\n\n` +
                `Se não foi você, ignore esta mensagem — sua senha continua a mesma.`
            ).then(result => {
              if (!result.sent) {
                console.warn("[AUTH] DM de recuperação não enviada:", result.reason);
              }
            }).catch(() => {});
          }
        } catch (e) {
          console.warn("[AUTH] Falha ao buscar Discord do usuário:", e.message);
        }
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
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.updateUser(user.id, { verification_token: verificationToken });
        await db.createAuthToken({
          userId: user.id,
          tokenHash: auth.hashToken(verificationToken),
          type: "verify",
          expiresAt: expires
        });
        email.sendVerificationEmail(userEmail, user.username, verificationToken).catch(err => {
          console.error("[BRAZUG] Falha ao reenviar e-mail de verificação:", err.message);
        });
      }
      res.json({ ok: true, message: "Se o e-mail estiver cadastrado e pendente, o link de verificação foi reenviado." });
    } catch (e) {
      console.error("[AUTH] resend:", e.message);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.get("/discord", function (req, res) {
    if (!providerConfig().discord) return res.status(404).json({ error: "Login Discord não configurado" });
    const state = signState();
    auth.setStateCookie(res, req, "brazug_oauth_state", state, 600);
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: redirectUri("/api/auth/discord/callback"),
      response_type: "code",
      scope: "identify email",
      state
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  router.get("/discord/callback", async function (req, res) {
    const saved = auth.readCookie(req, "brazug_oauth_state");
    auth.setStateCookie(res, req, "brazug_oauth_state", "", 0);
    if (!verifyState(req.query.state) || req.query.state !== saved) {
      return res.redirect("/login.html?error=oauth");
    }
    try {
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: redirectUri("/api/auth/discord/callback")
        })
      });
      if (!tokenRes.ok) return res.redirect("/login.html?error=oauth");
      const tokens = await tokenRes.json();
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (!userRes.ok) return res.redirect("/login.html?error=oauth");
      const profile = await userRes.json();
      await loginFromProvider(req, res, "discord", {
        id: String(profile.id),
        email: profile.verified ? auth.validateEmail(profile.email) : null,
        username: profile.username
      });
    } catch (e) {
      console.error("[AUTH] discord:", e.message);
      res.redirect("/login.html?error=oauth");
    }
  });

  router.get("/battlenet", function (req, res) {
    if (!providerConfig().battlenet) return res.status(404).json({ error: "Login Battle.net não configurado" });
    const state = signState();
    auth.setStateCookie(res, req, "brazug_oauth_state", state, 600);
    const params = new URLSearchParams({
      client_id: process.env.BLIZZARD_CLIENT_ID,
      redirect_uri: redirectUri("/api/auth/battlenet/callback"),
      response_type: "code",
      scope: "openid",
      state
    });
    res.redirect(`https://oauth.battle.net/authorize?${params}`);
  });

  router.get("/battlenet/callback", async function (req, res) {
    const saved = auth.readCookie(req, "brazug_oauth_state");
    auth.setStateCookie(res, req, "brazug_oauth_state", "", 0);
    if (!verifyState(req.query.state) || req.query.state !== saved) {
      return res.redirect("/login.html?error=oauth");
    }
    try {
      const basic = Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString("base64");
      const tokenRes = await fetch("https://oauth.battle.net/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: redirectUri("/api/auth/battlenet/callback")
        })
      });
      if (!tokenRes.ok) return res.redirect("/login.html?error=oauth");
      const tokens = await tokenRes.json();
      const userRes = await fetch("https://oauth.battle.net/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (!userRes.ok) return res.redirect("/login.html?error=oauth");
      const profile = await userRes.json();
      const battletag = String(profile.battletag || "bnet").split("#")[0];
      await loginFromProvider(req, res, "battlenet", {
        id: String(profile.id || profile.sub),
        email: null,
        username: battletag
      });
    } catch (e) {
      console.error("[AUTH] battlenet:", e.message);
      res.redirect("/login.html?error=oauth");
    }
  });

  return router;
}

module.exports = { createAuthRouter };
