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
const twitch = require("./lib/twitch.cjs");
const spotifyRoutes = require("./lib/spotify-routes.cjs");

const app = express();
app.set('trust proxy', 1); // Trust the first hop (proxy)
const PORT = process.env.PORT || 3000;

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

app.get("/uploads/*", (req, res) => {
  const subPath = req.params[0];
  for (const dir of uploadDirs) {
    const fullPath = path.join(dir, subPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return res.sendFile(fullPath);
    }
  }
  res.status(404).send("Upload file not found");
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
app.get("/cadastro-aventura.html", (req, res) => res.sendFile(path.resolve(__dirname, "cadastro-aventura.html")));
app.get("/forgot-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "forgot-password.html")));
app.get("/reset-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "reset-password.html")));
app.get("/ficha.html", (req, res) => res.sendFile(path.resolve(__dirname, "ficha.html")));
app.get("/vendas.html", (req, res) => res.sendFile(path.resolve(__dirname, "vendas.html")));

/* =========================================
   API
========================================= */
app.get("/api/config", (req, res) => {
  res.json({
    DISCORD_URL: process.env.DISCORD_URL || "https://discord.gg/brazug"
  });
});

app.get("/api/characters/search", async (req, res) => {
  const char = await db.getCharacterByName(req.query.name);
  if (!char) return res.status(404).json({ error: "Não encontrado" });
  res.json(char);
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

app.get("/api/debug-env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  });
});

app.use("/api/auth", authRoutes.createAuthRouter());
app.use("/api/admin", adminRoutes.createAdminRouter());
app.use("/api/sales", salesRoutes.createSalesRouter());
app.use("/api/spotify", spotifyRoutes.createSpotifyRouter());
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
