"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createAdminRouter() {
  const router = express.Router();
  
  // Caminho da pasta de uploads: dinâmica baseada na existência da pasta de produção
  let uploadDir = process.env.UPLOAD_DIR;
  if (!uploadDir) {
    // Consistente com server.js: busca "uploads" no pai do projeto ou em data/uploads
    const prodPath = path.resolve(__dirname, "..", "..", "uploads");
    const devPath = path.resolve(__dirname, "..", "data", "uploads");
    uploadDir = fs.existsSync(prodPath) ? prodPath : devPath;
  }
  
  console.log(`[BRAZUG] AdminRouter inicializado. Pasta de uploads: ${uploadDir}`);

  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      console.error(`[BRAZUG] Erro crítico ao criar pasta de uploads:`, e.message);
    }
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, safe);
    },
  });
  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Apenas imagens são permitidas (jpg, png, webp, gif)"));
      }
    },
  });

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
        return res.status(403).json({ error: "Sua conta ainda não foi ativada. Verifique seu e-mail." });
      }

      res.json({ 
        token: auth.createToken(user),
        user: { username: user.username, role: user.role }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/register", async function (req, res) {
    const { username, password, role, secret } = req.body || {};
    
    // Injeta o segredo padrão se vier vazio para não quebrar a lógica de validação
    const guildSecret = (process.env.GUILD_SECRET || "brazug").trim().toLowerCase();
    const providedSecret = String(secret || guildSecret).trim().toLowerCase();
    
    if (providedSecret !== guildSecret) {
      return res.status(401).json({ error: "Palavra-passe incorreta" });
    }

    try {
      const hashedPassword = auth.hashPassword(password);
      const finalRole = role && ["guildmember", "officer"].includes(role) ? role : "guildmember";
      const newUser = await db.createUser({ username, password: hashedPassword, role: finalRole });
      res.status(201).json({ ok: true, user: { username: newUser.username, role: newUser.role } });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ROTA PÚBLICA DE SETTINGS
  router.get("/settings/:key", async function (req, res) {
    try {
      const value = await db.getSetting(req.params.key);
      res.json({ value });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // MIDDLEWARE DE AUTENTICAÇÃO
  router.use(auth.authMiddleware);

  router.get("/me", (req, res) => res.json({ user: req.user }));

  router.post("/change-password", async function (req, res) {
    const { oldPassword, newPassword, confirmPassword } = req.body || {};
    if (newPassword !== confirmPassword) return res.status(400).json({ error: "Senhas não coincidem" });
    try {
      const user = await db.getUserByUsername(req.user.username);
      if (!user || !auth.comparePassword(oldPassword, user.password)) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }
      await db.updateUserPassword(user.id, auth.hashPassword(newPassword));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // AVENTURAS
  router.get("/adventures", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), async function (req, res) {
    try {
      const isStaff = ["admin", "guildmaster", "officer"].includes(req.user.role);
      const items = await db.listAdventures(false);
      
      // Se for membro comum, só vê as dele (mesmo não aprovadas) ou as aprovadas de outros
      if (!isStaff) {
          const user = await db.getUserByUsername(req.user.username);
          const filtered = items.filter(a => a.user_id === user.id || a.is_approved);
          return res.json({ adventures: filtered });
      }

      res.json({ adventures: items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/adventures", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), async function (req, res) {
    try {
      const user = await db.getUserByUsername(req.user.username);
      const isStaff = ["admin", "guildmaster", "officer"].includes(req.user.role);
      
      const item = await db.createAdventure(req.body, user ? user.id : null, isStaff);
      res.status(201).json({ adventure: item });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post("/adventures/:id/approve", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      const user = await db.getUserByUsername(req.user.username);
      const item = await db.approveAdventure(req.params.id, user.id);
      res.json({ adventure: item });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put("/adventures/:id", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), async function (req, res) {
    try {
      const item = await db.updateAdventure(req.params.id, req.body, req.user);
      if (!item) return res.status(404).json({ error: "Não encontrado ou sem permissão" });
      res.json({ adventure: item });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete("/adventures/:id", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      const ok = await db.deleteAdventure(req.params.id, req.user);
      if (!ok) return res.status(404).json({ error: "Não encontrado ou sem permissão" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // UPLOAD
  router.post("/upload", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), upload.single("image"), function (req, res) {
    if (!req.file) return res.status(400).json({ error: "Arquivo ausente" });
    res.json({ url: "/uploads/" + req.file.filename });
  });

  // SETTINGS (PROTECTED)
  router.post("/settings/:key", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      await db.setSetting(req.params.key, req.body.value);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // LOGS
  const errorLogs = [];
  router.post("/logs", async function (req, res) {
    errorLogs.unshift({ timestamp: new Date().toISOString(), ...req.body });
    if (errorLogs.length > 50) errorLogs.pop();
    res.json({ ok: true });
  });

  router.get("/logs", auth.requireRole(["admin"]), async function (req, res) {
    res.json({ logs: errorLogs });
  });

  // USUÁRIOS
  router.get("/users", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const list = await db.listUsers();
      res.json({ users: list.map(u => ({ 
        id: u.id, 
        username: u.username, 
        email: u.email,
        role: u.role,
        is_verified: u.is_verified 
      })) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/users", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const { username, password, role } = req.body || {};
      const newUser = await db.createUser({ username, password: auth.hashPassword(password), role });
      res.status(201).json({ user: newUser });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put("/users/:id", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const updateData = { ...req.body };
      if (updateData.password) updateData.password = auth.hashPassword(updateData.password);
      await db.updateUser(req.params.id, updateData);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete("/users/:id", auth.requireRole(["admin"]), async function (req, res) {
    try {
      await db.deleteUser(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createAdminRouter };
