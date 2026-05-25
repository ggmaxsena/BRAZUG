"use strict";

const express = require("express");
const crypto = require("crypto");
const db = require("./db.cjs");
const auth = require("./auth.cjs");
const email = require("./email.cjs");

function createAuthRouter() {
  const router = express.Router();

  // Registro com verificação de e-mail
  router.post("/register", async function (req, res) {
    const { username, email: userEmail, password, role, secret } = req.body || {};
    
    // Validação de senha da guilda removida por solicitação do usuário para liberar cadastro
    /*
    const guildSecret = (process.env.GUILD_SECRET || "brazug").trim().toLowerCase();
    const providedSecret = String(secret || "").trim().toLowerCase();
    if (guildSecret && providedSecret !== guildSecret) {
        return res.status(401).json({ error: "Palavra-passe da guilda incorreta" });
    }
    */

    if (!username || !userEmail || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedPassword = auth.hashPassword(password);
      const finalRole = role && ["guildmember", "officer"].includes(role) ? role : "guildmember";

      const newUser = await db.createUser({
        username,
        email: userEmail,
        password: hashedPassword,
        role: finalRole,
        verification_token: verificationToken
      });

      // Enviar e-mail em segundo plano
      email.sendVerificationEmail(userEmail, username, verificationToken).catch(err => {
        console.error("[BRAZUG] Falha ao enviar e-mail de verificação:", err.message);
      });

      res.status(201).json({ 
        ok: true, 
        message: "Conta criada! Verifique seu e-mail para ativar sua conta." 
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

  return router;
}

module.exports = { createAuthRouter };
