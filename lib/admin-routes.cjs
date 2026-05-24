"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createAdminRouter() {
  const router = express.Router();
  
  // Caminho absoluto para evitar erros em produção (Hostinger)
  const uploadDir = path.resolve(__dirname, "..", "data", "uploads");
  
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
      // Verifica se a pasta ainda existe antes de salvar
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
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
    
    console.log(`[BRAZUG] Tentativa de login: user=${username}`);

    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    try {
      const user = await db.getUserByUsername(username);
      
      if (!user) {
        console.log(`[BRAZUG] Login falhou: Usuário '${username}' não encontrado.`);
        return res.status(401).json({ error: "Usuário ou senha incorretos" });
      }

      const match = auth.comparePassword(password, user.password);
      if (!match) {
        console.log(`[BRAZUG] Login falhou: Senha incorreta para '${username}'.`);
        return res.status(401).json({ error: "Usuário ou senha incorretos" });
      }

      console.log(`[BRAZUG] Login bem-sucedido: ${username} (Role: ${user.role})`);

      res.json({ 
        token: auth.createToken(user),
        user: { username: user.username, role: user.role }
      });
    } catch (e) {
      console.error(`[BRAZUG] Erro no login:`, e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // AUTO-CADASTRO COM PALAVRA-PASSE
  router.post("/register", async function (req, res) {
    const { username, password, role, secret } = req.body || {};
    const guildSecret = process.env.GUILD_SECRET || "brazug123";

    if (!username || !password || !secret) {
      return res.status(400).json({ error: "Preencha todos os campos" });
    }

    if (secret !== guildSecret) {
      return res.status(401).json({ error: "Palavra-passe da guilda incorreta" });
    }

    try {
      const hashedPassword = auth.hashPassword(password);
      // Força role guildmember se não for enviada ou se for inválida (apenas admins criam outros roles via painel interno)
      const finalRole = role && ["guildmember", "officer"].includes(role) ? role : "guildmember";
      
      const newUser = await db.createUser({ 
        username, 
        password: hashedPassword, 
        role: finalRole 
      });

      res.status(201).json({ 
        ok: true, 
        user: { username: newUser.username, role: newUser.role } 
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.use(auth.authMiddleware);

  // Informações do usuário logado
  router.get("/me", function (req, res) {
    res.json({ user: req.user });
  });

  // AVENTURAS
  router.get("/adventures", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), async function (req, res) {
    try {
      console.log(`[BRAZUG] Buscando todas as aventuras (admin)...`);
      const items = await db.listAdventures(false);
      console.log(`[BRAZUG] Total de aventuras encontradas: ${items.length}`);
      res.json({ adventures: items });
    } catch (e) {
      console.error(`[BRAZUG] Erro ao listar aventuras:`, e.message);
      res.status(500).json({ error: e.message });
    }
  });

  async function getBase64Image(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith("/uploads/")) return null;
    try {
      const fileName = imageUrl.replace("/uploads/", "");
      const filePath = path.resolve(__dirname, "..", "data", "uploads", fileName);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const mimeType = imageUrl.endsWith(".png") ? "image/png" : imageUrl.endsWith(".webp") ? "image/webp" : imageUrl.endsWith(".gif") ? "image/gif" : "image/jpeg";
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    } catch (e) {
      console.error("[BRAZUG] Erro ao converter imagem para Base64:", e.message);
    }
    return null;
  }

  router.post("/adventures", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      console.log(`[BRAZUG] Criando nova aventura: ${req.body.title}`);
      const payload = req.body || {};
      
      payload.image_data = await getBase64Image(payload.image_url);

      const item = await db.createAdventure(payload);
      console.log(`[BRAZUG] Aventura criada com sucesso! ID: ${item.id}`);
      res.status(201).json({ adventure: item });
    } catch (e) {
      console.error(`[BRAZUG] Erro ao criar aventura:`, e.message);
      res.status(400).json({ error: e.message });
    }
  });

  router.put("/adventures/:id", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      const id = req.params.id;
      console.log(`[BRAZUG] Atualizando aventura ID: ${id}`);
      const payload = req.body || {};

      if (payload.image_url) {
        payload.image_data = await getBase64Image(payload.image_url);
      }

      const item = await db.updateAdventure(id, payload);
      if (!item) {
        console.log(`[BRAZUG] Falha ao atualizar: Aventura ID ${id} não encontrada.`);
        res.status(404).json({ error: "Não encontrado" });
        return;
      }
      console.log(`[BRAZUG] Aventura ID ${id} atualizada.`);
      res.json({ adventure: item });
    } catch (e) {
      console.error(`[BRAZUG] Erro ao atualizar aventura:`, e.message);
      res.status(400).json({ error: e.message });
    }
  });

  router.delete("/adventures/:id", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      const id = req.params.id;
      console.log(`[BRAZUG] Solicitando exclusão da aventura ID: ${id}`);
      await db.deleteAdventure(id);
      console.log(`[BRAZUG] Aventura ID ${id} excluída.`);
      res.json({ ok: true });
    } catch (e) {
      console.error(`[BRAZUG] Erro ao excluir aventura:`, e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // UPLOAD
  router.post("/upload", auth.requireRole(["admin", "guildmaster", "officer"]), upload.single("image"), function (req, res) {
    if (!req.file) {
      res.status(400).json({ error: "Arquivo ausente" });
      return;
    }
    res.json({ url: "/uploads/" + req.file.filename });
  });

  // USUÁRIOS (ADMIN ONLY)
  router.get("/users", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const list = await db.listUsers();
      // Não retornar as senhas
      res.json({ users: list.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at })) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/users", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const { username, password, role } = req.body || {};
      if (!username || !password || !role) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      
      const hashedPassword = auth.hashPassword(password);
      const newUser = await db.createUser({ username, password: hashedPassword, role });
      
      res.status(201).json({ user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    } catch (e) {
      res.status(400).json({ error: e.message });
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
