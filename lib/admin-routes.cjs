"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./db.cjs");
const auth = require("./auth.cjs");
const analytics = require("./admin-analytics.cjs");

function createAdminRouter() {

  const router = express.Router();

  // Caminho da pasta de uploads: dinâmica baseada na existência da pasta de produção e estrutura da Hostinger
  function getPersistentUploadDir() {
    if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;

    const domainMatch = __dirname.match(/(.*\/domains\/[^\/]+)/);
    if (domainMatch) {
      const domainRoot = domainMatch[1];
      const publicHtmlUploads = path.join(domainRoot, "public_html", "uploads");
      const domainUploads = path.join(domainRoot, "uploads");

      if (fs.existsSync(publicHtmlUploads)) return publicHtmlUploads;
      if (fs.existsSync(domainUploads)) return domainUploads;

      try {
        fs.mkdirSync(publicHtmlUploads, { recursive: true });
        return publicHtmlUploads;
      } catch (e) {}
    }

    return path.resolve(__dirname, "..", "..", "uploads");
  }

  const uploadDir = getPersistentUploadDir();

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
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const shardedPath = path.join(uploadDir, year, month);

      if (!fs.existsSync(shardedPath)) {
        fs.mkdirSync(shardedPath, { recursive: true });
      }
      cb(null, shardedPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const randomHash = require("crypto").randomBytes(4).toString("hex");
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      
      const finalName = `braimg-${timestamp}-${randomHash}${ext}`;
      cb(null, finalName);
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

      const raw = await auth.createSession(req, user);
      auth.setSessionCookie(res, req, raw);
      const body = { user: { username: user.username, role: user.role, id: user.id } };
      if (req.get("x-return-token") === "1") body.token = auth.createToken(user);
      res.json(body);
    } catch (e) {
      res.status(500).json({ error: e.message });
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

  // ── ANALYTICS / RELATÓRIOS ──────────────────────────────────────────────
  router.get("/analytics", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      res.json(await analytics.getDashboard());
    } catch (e) {
      console.error("[ADMIN] analytics:", e.message);
      res.status(500).json({ error: "Não foi possível carregar as métricas." });
    }
  });

  router.get("/characters", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      const characters = await analytics.listCharacters(req.query.search || "", req.query.limit || 500);
      res.json({ characters });
    } catch (e) {
      console.error("[ADMIN] characters:", e.message);
      res.status(500).json({ error: "Não foi possível carregar personagens." });
    }
  });

  function sendCsv(res, filename, csv) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  router.get("/reports/players.csv", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      sendCsv(res, "brazug-jogadores.csv", await analytics.getPlayersCsv());
    } catch (e) {
      console.error("[ADMIN] players csv:", e.message);
      res.status(500).json({ error: "Não foi possível gerar o relatório." });
    }
  });

  router.get("/reports/characters.csv", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      sendCsv(res, "brazug-personagens.csv", await analytics.getCharactersCsv());
    } catch (e) {
      console.error("[ADMIN] characters csv:", e.message);
      res.status(500).json({ error: "Não foi possível gerar o relatório." });
    }
  });

  router.get("/reports/classes.csv", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      sendCsv(res, "brazug-classes.csv", await analytics.getClassesCsv());
    } catch (e) {
      console.error("[ADMIN] classes csv:", e.message);
      res.status(500).json({ error: "Não foi possível gerar o relatório." });
    }
  });

  router.get("/reports/adventures.csv", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      sendCsv(res, "brazug-aventuras.csv", await analytics.getAdventuresCsv());
    } catch (e) {
      console.error("[ADMIN] adventures csv:", e.message);
      res.status(500).json({ error: "Não foi possível gerar o relatório." });
    }
  });

  router.get("/reports/cores.csv", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      sendCsv(res, "brazug-inscricoes-core.csv", await analytics.getCoresCsv());
    } catch (e) {
      console.error("[ADMIN] cores csv:", e.message);
      res.status(500).json({ error: "Não foi possível gerar o relatório." });
    }
  });

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

  router.get("/adventures/:id", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), async function (req, res) {
    try {
      const item = await db.getAdventure(req.params.id);
      if (!item) return res.status(404).json({ error: "Aventura não encontrada" });

      const isStaff = ["admin", "guildmaster", "officer"].includes(req.user.role);
      const user = await db.getUserByUsername(req.user.username);

      // Verificação de permissão: staff vê tudo, membro vê a sua ou aprovadas
      if (!isStaff && item.user_id !== user.id && !item.is_approved) {
          return res.status(403).json({ error: "Acesso negado" });
      }

      res.json({ adventure: item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/adventures", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), async function (req, res) {
    try {
      const user = await db.getUserByUsername(req.user.username);
      const isStaff = ["admin", "guildmaster", "officer"].includes(req.user.role);

      // Modo "sombras" foi removido; visibilidade antiga vira pública.
      if (req.body.visibility === 'shadow') {
          req.body.visibility = 'public';
      }

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
      // Modo "sombras" foi removido; visibilidade antiga vira pública.
      if (req.body.visibility === 'shadow') {
          req.body.visibility = 'public';
      }

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
  router.post("/upload", auth.requireRole(["admin", "guildmaster", "officer", "guildmember"]), upload.single("image"), async function (req, res) {
    console.log(`[UPLOAD DEBUG] User:`, req.user);
    if (!req.file) return res.status(400).json({ error: "Arquivo ausente" });
    
    console.log(`[UPLOAD] Recebido arquivo de ${req.user.username} (${req.user.role})`);
    
    try {
      const sharp = require("sharp");
      const tempPath = req.file.path + ".tmp";
      
      // Processa imagem: Rotaciona (se necessário), remove metadados e otimiza
      await sharp(req.file.path)
        .rotate() // Auto-orientação baseada em EXIF antes de remover
        .toFile(tempPath);
      
      // Substitui o original pelo processado
      fs.unlinkSync(req.file.path);
      fs.renameSync(tempPath, req.file.path);

      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const relativeUrl = `/uploads/${year}/${month}/${req.file.filename}`;
      
      res.json({ url: relativeUrl });
    } catch (err) {
      console.error("[Upload] Erro ao processar imagem:", err.message);
      // Se falhar o processamento, retornamos o original (opcional) ou erro
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, "0");
      res.json({ url: `/uploads/${year}/${month}/${req.file.filename}`, warning: "Metadados não removidos" });
    }
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

  // USUÁRIOS
  router.get("/users", auth.requireRole(["admin"]), async function (req, res) {
    try {
      res.json({ users: await analytics.listPlayers() });
    } catch (e) {
      console.error("[ADMIN] users:", e.message);
      res.status(500).json({ error: "Não foi possível carregar usuários." });
    }
  });

  router.post("/users", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const { username, email, password, role } = req.body || {};
      const validUsername = auth.validateUsername(username);
      const validEmail = email ? auth.validateEmail(email) : null;
      const passwordError = auth.validatePassword(password);
      if (!validUsername || passwordError || (email && !validEmail)) {
        return res.status(400).json({
          error: passwordError || "Usuário ou e-mail inválido."
        });
      }
      const finalRole = ["guildmember", "officer", "guildmaster", "admin"].includes(role)
        ? role
        : "guildmember";
      const newUser = await db.createUser({
        username: validUsername,
        email: validEmail,
        password: auth.hashPassword(password),
        role: finalRole
      });
      res.status(201).json({ user: newUser });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put("/users/:id", auth.requireRole(["admin"]), async function (req, res) {
    try {
      const updateData = { ...req.body };
      if (updateData.role && !["guildmember", "officer", "guildmaster", "admin", "banned"].includes(updateData.role)) {
        return res.status(400).json({ error: "Cargo inválido." });
      }
      if (updateData.password) {
        const passwordError = auth.validatePassword(updateData.password);
        if (passwordError) return res.status(400).json({ error: passwordError });
        updateData.password = auth.hashPassword(updateData.password);
      }
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
