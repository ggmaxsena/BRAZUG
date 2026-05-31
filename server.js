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

const app = express();
const PORT = process.env.PORT || 3002;
const ARMORY_URL = process.env.ARMORY_URL || "http://127.0.0.1:3000";

app.use(express.json({ limit: "10mb" }));

/* =========================================
   STATIC FILES & ICON PROXY
========================================= */
// Configuração dinâmica da pasta de uploads
let externalUploads = process.env.UPLOAD_DIR;

if (!externalUploads) {
  const prodPath = path.resolve(__dirname, "..", "..", "uploads");
  const devPath = path.resolve(__dirname, "data", "uploads");
  
  if (fs.existsSync(prodPath)) {
    externalUploads = prodPath;
  } else {
    externalUploads = devPath;
  }
}

const iconDir = path.resolve(__dirname, "assets", "icons");
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
   ARMORY SYSTEM (STABLE)
========================================= */

app.get("/api/armory/full/:realm/:name", async (req, res) => {
  try {
    const { realm, name } = req.params;
    let char = await db.getFullArmoryCharacter(name, realm);
    
    if (!char) {
      // Tenta um sync rápido
      console.log(`[Armory] Character ${name}-${realm} not found. Attempting quick sync...`);
      try {
        const syncRes = await fetch(`${ARMORY_URL}/api/character/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, realm, region: 'us' })
        });
        if (syncRes.ok) {
          console.log(`[Armory] Sync successful for ${name}-${realm}`);
          char = await db.getFullArmoryCharacter(name, realm);
        } else {
          console.warn(`[Armory] Sync failed for ${name}-${realm}: ${syncRes.status} ${syncRes.statusText}`);
        }
      } catch (e) {
        console.error(`[Armory] Sync error for ${name}-${realm}:`, e.message);
      }
    }

    if (!char) return res.status(404).json({ error: "Não encontrado" });
    res.json(char);
  } catch (err) {
    console.error("[API Error] /api/armory/full:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/armory*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "armory-ficha.html"));
});

/* =========================================
   PAGES
========================================= */
app.get("/", (req, res) => res.sendFile(path.resolve(__dirname, "index.html")));
app.get("/personagem.html", (req, res) => res.sendFile(path.resolve(__dirname, "personagem.html")));
app.get("/login.html", (req, res) => res.sendFile(path.resolve(__dirname, "login.html")));
app.get("/register.html", (req, res) => res.sendFile(path.resolve(__dirname, "register.html")));
app.get("/perfil.html", (req, res) => res.sendFile(path.resolve(__dirname, "perfil.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.resolve(__dirname, "admin.html")));
app.get("/cadastro-aventura.html", (req, res) => res.sendFile(path.resolve(__dirname, "cadastro-aventura.html")));
app.get("/forgot-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "forgot-password.html")));
app.get("/reset-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "reset-password.html")));
app.get("/ficha.html", (req, res) => res.sendFile(path.resolve(__dirname, "ficha.html")));
app.get("/vendas.html", (req, res) => res.sendFile(path.resolve(__dirname, "vendas.html")));

/* =========================================
   API
========================================= */
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
    const aRes = await fetch(`${ARMORY_URL}/api/test-env`).catch(() => null);
    if (aRes && aRes.ok) armory.ok = true;
  } catch (e) {}

  res.json({
    status: pg.ok && armory.ok ? "healthy" : "degraded",
    database: pg,
    armory: armory,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes.createAuthRouter());
app.use("/api/admin", adminRoutes.createAdminRouter());
app.use("/api/sales", salesRoutes.createSalesRouter());
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
      const [k, v] = t.split("=");
      process.env[k.trim()] = v.trim().replace(/^["']|["']$/g, "");
    }
  }
}

start().catch(err => console.error("Startup failed:", err));
