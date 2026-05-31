"use strict";

const express = require("express");
const crypto = require("crypto");
const db = require("./db.cjs");
const auth = require("./auth.cjs");
const email = require("./email.cjs");

function createAuthRouter() {
  const router = express.Router();

  // Login
  router.post("/login", async function (req, res) {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }
    try {
      const user = await db.getUserByUsername(username);
      if (!user || !auth.comparePassword(password, user.password)) {
        return res.status(401).json({ error: "Usuário ou senha incorretos" });
      }

      if (user.email && !user.is_verified) {
        return res.status(403).json({ 
            error: "Sua conta ainda não foi ativada.",
            needs_verification: true,
            email: user.email
        });
      }

      res.json({ 
        token: auth.createToken({ id: user.id, username: user.username, role: user.role }),
        user: { username: user.username, role: user.role }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Registro com verificação de e-mail
  router.post("/register", async function (req, res) {
    const { username, email: userEmail, password, role, secret } = req.body || {};
    
    // Validação de senha da guilda (Passa default internamente para não exigir do usuário)
    const guildSecret = (process.env.GUILD_SECRET || "brazug").trim().toLowerCase();
    const providedSecret = String(secret || guildSecret).trim().toLowerCase();
    if (providedSecret !== guildSecret) {
        return res.status(401).json({ error: "Palavra-passe da guilda incorreta" });
    }

    if (!username || !userEmail || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      const hashedPassword = auth.hashPassword(password);
      const finalRole = role && ["guildmember", "officer"].includes(role) ? role : "guildmember";

      const verificationToken = crypto.randomBytes(32).toString("hex");

      const newUser = await db.createUser({
        username,
        email: userEmail,
        password: hashedPassword,
        role: finalRole,
        verification_token: verificationToken
      });

      email.sendVerificationEmail(userEmail, username, verificationToken).catch(err => {
        console.error("[BRAZUG] Falha ao enviar e-mail de verificação no cadastro:", err.message);
      });

      res.status(201).json({ 
        ok: true, 
        message: "Conta criada com sucesso! Verifique seu e-mail para ativar sua conta." 
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Verificação de E-mail
  router.get("/verify", async function (req, res) {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token ausente");

    try {
      const user = await db.verifyUser(token);
      if (!user) return res.status(400).send("Token inválido ou expirado");
      
      // Redirecionar para o login com mensagem de sucesso
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

  // Esqueci a Senha
  router.post("/forgot-password", async function (req, res) {
    const { email: userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: "E-mail é obrigatório" });

    try {
      const user = await db.getUserByEmail(userEmail);
      if (!user) {
        // Por segurança, não informamos se o e-mail existe ou não
        return res.json({ ok: true, message: "Se o e-mail existir, um link de recuperação será enviado." });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 hora

      await db.setResetToken(userEmail, resetToken, expires);
      
      email.sendResetPasswordEmail(userEmail, user.username, resetToken).catch(err => {
        console.error("[BRAZUG] Falha ao enviar e-mail de recuperação:", err.message);
      });

      res.json({ ok: true, message: "Link de recuperação enviado!" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Redefinir Senha (Processamento)
  router.post("/reset-password", async function (req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Dados incompletos" });

    try {
      const user = await db.getUserByResetToken(token);
      if (!user) return res.status(400).json({ error: "Token inválido ou expirado" });

      await db.resetPassword(token, auth.hashPassword(password));
      res.json({ ok: true, message: "Senha alterada com sucesso!" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Reenvio de verificação
  router.post("/resend-verification", async function (req, res) {
    const { email: userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: "E-mail é obrigatório" });

    try {
      const user = await db.getUserByEmail(userEmail);
      if (!user) {
        // Por segurança, fingimos que enviamos
        return res.json({ ok: true, message: "Se o e-mail estiver cadastrado, o link de verificação foi reenviado." });
      }
      
      if (user.is_verified) {
          return res.status(400).json({ error: "Conta já está verificada." });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      await db.updateUser(user.id, { verification_token: verificationToken });

      email.sendVerificationEmail(userEmail, user.username, verificationToken).catch(err => {
        console.error("[BRAZUG] Falha ao reenviar e-mail de verificação:", err.message);
      });

      res.json({ ok: true, message: "Link de verificação reenviado!" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createAuthRouter };
