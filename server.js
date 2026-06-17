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
const ARMORY_URL = process.env.ARMORY_URL || "http://2.24.124.162:3001";

app.use(express.json({ limit: "10mb" }));

/* =========================================
   STATIC FILES & ICON PROXY
========================================= */
const externalUploads = process.env.UPLOAD_DIR || path.resolve(__dirname, "..", "uploads");

console.log(`[BRAZUG] Static serving: Uploads from ${externalUploads}`);
const iconDir = path.resolve(__dirname, "assets", "icons");
console.log(`[BRAZUG] Static serving: Icons from ${iconDir}`);

if (!fs.existsSync(externalUploads)) fs.mkdirSync(externalUploads, { recursive: true });
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

app.use("/uploads", express.static(externalUploads));
app.use("/css", express.static(path.resolve(__dirname, "css")));
app.use("/js", express.static(path.resolve(__dirname, "js")));
app.use("/assets", express.static(path.resolve(__dirname, "assets")));

/* =========================================
   ARMORY SYSTEM (INTEGRATION)
========================================= */

app.get("/api/armory/full/:realm/:name", async (req, res) => {
  try {
    const { realm, name } = req.params;
    let char = await db.getFullArmoryCharacter(name, realm);

    if (!char) {
      console.log(`[Armory] Character ${name}-${realm} not found. Attempting quick sync...`);

      let syncRes = null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s for Blizzard syncs
        syncRes = await fetch(`${ARMORY_URL}/api/character/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, realm, region: 'us' }),
          signal: controller.signal
        });
        clearTimeout(timeout);
      } catch (e) {
        console.error(`[Armory] Sync request failed/timeout for ${name}-${realm}: ${e.message}`);
        return res.status(503).json({ error: "O servidor de sincronização está demorando. Tente novamente em instantes." });
      }

      if (syncRes.status === 404) {
        return res.status(404).json({ error: "Personagem não encontrado na Blizzard." });
      }

      if (!syncRes.ok) {
        const errorData = await syncRes.json().catch(() => ({}));
        console.error(`[Armory] Sync backend error for ${name}-${realm}:`, syncRes.status, errorData);
        return res.status(syncRes.status).json({ error: errorData.error || "Erro ao sincronizar com o Armory." });
      }

      char = await db.getFullArmoryCharacter(name, realm);
    }

    if (!char) return res.status(503).json({ error: "Sincronizando personagem... os dados estarão prontos em instantes." });
    res.json(char);
  } catch (err) {
    console.error("[Armory Route Error]", err);
    res.status(500).json({ error: "Erro interno ao processar dados do Armory" });
  }
});

// Serve o template visual do Armory (Stable)
app.get("/armory/:realm/:name", (req, res) => {
    res.sendFile(path.resolve(__dirname, "armory-ficha.html"));
});

app.get("/armory/:region/:realm/:name", (req, res) => {
    res.sendFile(path.resolve(__dirname, "armory-ficha.html"));
});

app.get("/armory*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "armory-ficha.html"));
});

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
  let armory = { ok: false };
  try {
    const aRes = await fetch(`${ARMORY_URL}/api/character/fetch/unknown/unknown`).catch(() => null);
    if (aRes && [200, 400, 404].includes(aRes.status)) armory.ok = true;
  } catch (e) {}

  // Check file system
  const fsStatus = {
    uploads: {
      path: externalUploads,
      exists: fs.existsSync(externalUploads),
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
    const testFile = path.join(externalUploads, ".write-test");
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
    ARMORY_URL: process.env.ARMORY_URL,
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
  await db.init();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[STABLE] Website Online: http://localhost:${PORT}`);
  });
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
