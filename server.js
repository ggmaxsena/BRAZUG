"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");

loadEnv();

const db = require("./lib/db.cjs");
const auth = require("./lib/auth.cjs");
const authRoutes = require("./lib/auth-routes.cjs");
const adminRoutes = require("./lib/admin-routes.cjs");
const characterRoutes = require("./lib/character-routes.cjs");
const salesRoutes = require("./lib/sales-routes.cjs");
const sucessoRoutes = require("./lib/sucesso-routes.cjs");
const twitch = require("./lib/twitch.cjs");
const forever = require("./lib/forever.cjs");
const spotifyRoutes = require("./lib/spotify-routes.cjs");
const deathmapRoutes = require("./lib/deathmap-routes.cjs");
const coreRoutes = require("./lib/core-routes.cjs");

const app = express();
app.disable("x-powered-by");
app.set('trust proxy', 1); // Trust the first hop (proxy)
const PORT = process.env.PORT || 3000;
// DeathLog e badge de mortes ficam ocultos até o Hardcore do WoW Forever começar.
const FOREVER_HC_ACTIVE = /^(1|true|yes|on)$/i.test(String(process.env.FOREVER_HC_ACTIVE || ""));

// Headers de segurança básicos (sem CSP para não quebrar os scripts inline atuais).
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  if (req.secure || proto === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use((req, res, next) => {
  const host = String(req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (proto === "http" && !local) {
    const base = process.env.BASE_URL
      ? String(process.env.BASE_URL).replace(/\/$/, "")
      : `https://${host}`;
    return res.redirect(301, `${base}${req.originalUrl}`);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

/* =========================================
   STATIC FILES & ICON PROXY
========================================= */
function getCandidateUploadDirs() {
  const dirs = [];
  if (process.env.UPLOAD_DIR) dirs.push(process.env.UPLOAD_DIR);

  // Hostinger domain root detection (e.g. /home/u681328529/domains/brazug.com)
  const domainMatch = __dirname.match(/(.*\/domains\/[^\/]+)/);
  if (domainMatch) {
    const domainRoot = domainMatch[1];
    dirs.push(path.join(domainRoot, "public_html", "uploads"));
    dirs.push(path.join(domainRoot, "uploads"));
  }

  dirs.push(path.resolve(__dirname, "uploads"));
  dirs.push(path.resolve(__dirname, "..", "uploads"));
  dirs.push(path.resolve(__dirname, "..", "..", "uploads"));
  dirs.push(path.resolve(__dirname, "..", "..", "..", "uploads"));
  dirs.push(path.resolve(__dirname, "..", "..", "..", "..", "uploads"));
  dirs.push("/uploads");

  return [...new Set(dirs.filter(Boolean))];
}

const uploadDirs = getCandidateUploadDirs();

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  if (fs.existsSync(dir)) {
    console.log(`[BRAZUG] Static serving: Uploads from ${dir}`);
    app.use("/uploads", express.static(dir));
  }
});

const iconDir = path.resolve(__dirname, "assets", "icons");
console.log(`[BRAZUG] Static serving: Icons from ${iconDir}`);

if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

app.get("/assets/icons/:filename", async (req, res) => {
  const filePath = path.join(iconDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Download if not exists
  try {
    const url = `https://render.worldofwarcraft.com/classic1x-us/icons/56/${req.params.filename}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(404).send("Icon not found");

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    res.type('image/jpeg').send(buffer);
  } catch (e) {
    res.status(500).send("Error downloading icon");
  }
});

app.use("/css", express.static(path.resolve(__dirname, "css")));
app.use("/js", express.static(path.resolve(__dirname, "js")));
app.use("/assets", express.static(path.resolve(__dirname, "assets")));

/* =========================================
   PAGES (PROTECTED & PUBLIC)
========================================= */
const protectPage = (allowedRoles) => {
  return (req, res, next) => {
    // Para páginas HTML, o token geralmente vem via query param ou cookie se quisermos proteção total no GET
    // Mas aqui as páginas são estáticas. O ideal é que o frontend valide,
    // porém para uma segurança extra, podemos interceptar o GET se houver um cookie.
    // Como o app usa localStorage, o servidor não tem acesso ao token no GET inicial da página.
    // SOLUÇÃO: Vamos transformar /admin.html em uma rota que exige validação se possível,
    // ou ao menos garantir que o frontend redirecione AGRESSIVAMENTE.

    // Por enquanto, vamos manter a lógica de que a API é o que importa,
    // mas vamos adicionar uma rota de verificação que o frontend DEVE chamar.
    next();
  };
};

app.get("/", (req, res) => res.sendFile(path.resolve(__dirname, "index.html")));
app.get("/personagem.html", (req, res) => res.sendFile(path.resolve(__dirname, "personagem.html")));
app.get("/login.html", (req, res) => res.sendFile(path.resolve(__dirname, "login.html")));
app.get("/register.html", (req, res) => res.sendFile(path.resolve(__dirname, "register.html")));
app.get("/perfil.html", (req, res) => res.sendFile(path.resolve(__dirname, "perfil.html")));

// Proteção básica para o admin.html no servidor (apenas se usássemos cookies)
// Como usamos localStorage, o GET inicial sempre funcionará, mas o AdminController vai validar.
app.get("/admin.html", (req, res) => res.sendFile(path.resolve(__dirname, "admin.html")));
app.get("/admin-core.html", (req, res) => res.sendFile(path.resolve(__dirname, "admin-core.html")));
app.get("/cadastro-aventura.html", (req, res) => res.sendFile(path.resolve(__dirname, "cadastro-aventura.html")));
app.get("/forgot-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "forgot-password.html")));
app.get("/reset-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "reset-password.html")));
app.get("/ficha.html", (req, res) => res.sendFile(path.resolve(__dirname, "ficha.html")));
app.get("/vendas.html", (req, res) => res.sendFile(path.resolve(__dirname, "vendas.html")));
app.get("/sucesso.html", (req, res) => res.sendFile(path.resolve(__dirname, "sucesso.html")));
app.get("/sucesso", (req, res) => res.sendFile(path.resolve(__dirname, "sucesso.html")));
app.get("/deathlog.html", (req, res) => {
  if (!FOREVER_HC_ACTIVE) return res.redirect(302, "/");
  res.sendFile(path.resolve(__dirname, "deathlog.html"));
});
app.get("/deathlog", (req, res) => {
  if (!FOREVER_HC_ACTIVE) return res.redirect(302, "/");
  res.sendFile(path.resolve(__dirname, "deathlog.html"));
});
app.get("/core.html", (req, res) => res.sendFile(path.resolve(__dirname, "core.html")));
app.get("/core", (req, res) => res.sendFile(path.resolve(__dirname, "core.html")));

/* =========================================
   TALENTS PAGES
========================================= */
app.use("/talents", express.static(path.resolve(__dirname, "talents")));
app.get("/talents", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "index.html")));
app.get("/talents/", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "index.html")));
app.get("/talents/talent-calc.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "talent-calc.html")));
app.get("/talents/warrior_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "warrior_talents.html")));
app.get("/talents/mage_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "mage_talents.html")));
app.get("/talents/warlock_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "warlock_talents.html")));
app.get("/talents/hunter_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "hunter_talents.html")));
app.get("/talents/shaman_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "shaman_talents.html")));
app.get("/talents/druid_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "druid_talents.html")));
app.get("/talents/rogue_talents.html", (req, res) => res.sendFile(path.resolve(__dirname, "talents", "rogue_talents.html")));

/* =========================================
   API
========================================= */
app.get("/api/config", (req, res) => {
  res.json({
    DISCORD_URL: process.env.DISCORD_URL || "https://discord.gg/brazug",
    FOREVER_HC_ACTIVE
  });
});

app.get("/api/characters/search", async (req, res) => {
  try {
    const char = await db.getCharacterByName(req.query.name);
    if (!char) return res.status(404).json({ error: "Não encontrado" });

    const user = await auth.resolveRequestUser(req).catch(() => null);
    const isOwner = user && String(char.user_id) === String(user.id);
    const isAdmin = user && user.role === "admin";

    if (char.visibility !== "public" && !isOwner && !isAdmin) {
      return res.status(404).json({ error: "Não encontrado" });
    }

    res.json(char);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar personagem." });
  }
});

app.get("/api/live-streams", async (req, res) => {
  try {
    const streams = await twitch.collectBrazugStreams();
    res.json(twitch.liveStreamsPayload(streams));
  } catch (err) {
    console.error("[API] Twitch Error:", err.message);
    res.status(500).json({ error: "Falha ao carregar streams" });
  }
});

app.get("/api/forever/guilds", async (req, res) => {
  try {
    const data = await forever.getForeverGuilds();
    res.set("Cache-Control", "public, max-age=60");
    res.json(data);
  } catch (err) {
    console.error("[API] Blizzard Forever Error:", err.message);
    res.status(502).json({ error: "Falha ao carregar os dados da guilda no WoW Forever." });
  }
});

app.get("/api/health", async (req, res) => {
  const pg = await db.pingPostgres();
  let armory = { ok: true }; // Armory API removed, pretend it's ok or just ignore it.

  const primaryUploadDir = uploadDirs[0] || path.resolve(__dirname, "uploads");
  const fsStatus = {
    uploads: {
      path: primaryUploadDir,
      exists: fs.existsSync(primaryUploadDir),
      writable: false
    },
    icons: {
      path: iconDir,
      exists: fs.existsSync(iconDir),
      writable: false
    },
    branding: {
      logo: fs.existsSync(path.resolve(__dirname, "assets", "branding", "LOGO.png")),
      guia: fs.existsSync(path.resolve(__dirname, "assets", "branding", "guia1.gif"))
    }
  };

  try {
    const testFile = path.join(primaryUploadDir, ".write-test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    fsStatus.uploads.writable = true;
  } catch (e) {}

  try {
    const testFile = path.join(iconDir, ".write-test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    fsStatus.icons.writable = true;
  } catch (e) {}

  res.json({
    status: pg.ok && armory.ok && fsStatus.uploads.writable ? "healthy" : "degraded",
    database: pg,
    armory: armory,
    fileSystem: fsStatus,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes.createAuthRouter());
app.use("/api/admin", adminRoutes.createAdminRouter());
app.use("/api/sales", salesRoutes.createSalesRouter());
app.use("/api/sucesso", sucessoRoutes.createSucessoRouter());
app.use("/api/spotify", spotifyRoutes.createSpotifyRouter());
app.use("/api/brazug", deathmapRoutes.createDeathmapRouter());
app.use("/api/core", coreRoutes.createCoreRouter());
app.use("/api", characterRoutes.createCharacterRouter());

async function start() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[STABLE] Website Online: http://localhost:${PORT}`);
  });

  try {
    await db.init();
    console.log(`[STABLE] Database initialized successfully.`);
  } catch (err) {
    console.error(`[STABLE] Warning: Database initialization failed on startup: ${err.message}`);
  }
}

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;

      const idx = t.indexOf("=");
      const k = t.substring(0, idx).trim();
      const v = t.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[k] = v;
    }
  }
}

start().catch(err => console.error("Startup failed:", err));
