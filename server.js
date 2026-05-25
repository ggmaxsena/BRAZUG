"use strict";

console.log(
  "[BRAZUG] boot",
  new Date().toISOString(),
  "node=" + process.version,
  "cwd=" + process.cwd()
);

const fs = require("fs");
const path = require("path");

loadEnv();

const express = require("express");

const {
  collectBrazugStreams,
  liveStreamsPayload,
} = require("./lib/twitch.cjs");

const db = require("./lib/db.cjs");
const auth = require("./lib/auth.cjs");
const authRoutes = require("./lib/auth-routes.cjs");
const adminRoutes = require("./lib/admin-routes.cjs");

/* =========================================
   INITIALIZATION
========================================= */

async function ensureAdminUser() {
  try {
    const users = await db.listUsers();
    
    if (users.length === 0) {
      const defaultPassword = process.env.ADMIN_PASSWORD || "admin123";
      
      console.log("[BRAZUG] No users found. Creating default 'admin' user...");
      
      await db.createUser({
        username: "admin",
        password: auth.hashPassword(defaultPassword),
        role: "admin"
      });
      
      console.log("[BRAZUG] Default admin user created successfully.");
    }
  } catch (err) {
    console.error("[BRAZUG] Failed to ensure admin user:", err.message);
  }
}

/* =========================================
   ENV
========================================= */

function loadEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const text = fs.readFileSync(envPath, "utf8");

  for (const line of text.split("\n")) {
    const t = line.trim();

    if (!t || t.startsWith("#")) {
      continue;
    }

    const i = t.indexOf("=");

    if (i === -1) {
      continue;
    }

    const key = t.slice(0, i).trim();

    if (process.env[key]) {
      continue;
    }

    process.env[key] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

/* =========================================
   PORT
========================================= */

function resolvePort() {
  const args = process.argv;

  const i = args.indexOf("-p");

  if (i !== -1 && args[i + 1]) {
    const n = Number(args[i + 1]);

    if (n > 0) {
      return n;
    }
  }

  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();

/* =========================================
   EXPRESS
========================================= */

const app = express();

app.use(
  express.json({
    limit: "10mb",
  })
);

/* =========================================
   ENSURE UPLOADS FOLDER
========================================= */

// Verifica se existe a pasta de uploads fora da pasta nodejs (para persistência no deploy)
const externalUploads = path.resolve(__dirname, "..", "uploads");
const internalUploads = path.resolve(__dirname, "data", "uploads");
const uploadsDir = fs.existsSync(externalUploads) ? externalUploads : internalUploads;

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  console.log("[BRAZUG] uploads dir:", uploadsDir);
} catch (err) {
  console.error("[BRAZUG] failed to create uploads dir:", err.message);
}

/* =========================================
   STATIC FILES
========================================= */

app.use("/uploads", express.static(uploadsDir));

// Servir apenas pastas específicas de assets
app.use("/css", express.static(path.resolve(__dirname, "css")));
app.use("/js", express.static(path.resolve(__dirname, "js")));
app.use("/assets", express.static(path.resolve(__dirname, "assets")));

// Servir arquivos HTML específicos
app.get("/", (req, res) => res.sendFile(path.resolve(__dirname, "index.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.resolve(__dirname, "admin.html")));
app.get("/login.html", (req, res) => res.sendFile(path.resolve(__dirname, "login.html")));
app.get("/perfil.html", (req, res) => res.sendFile(path.resolve(__dirname, "perfil.html")));
app.get("/cadastro-aventura.html", (req, res) => res.sendFile(path.resolve(__dirname, "cadastro-aventura.html")));
app.get("/ficha.html", (req, res) => res.sendFile(path.resolve(__dirname, "ficha.html")));
app.get("/personagem.html", (req, res) => res.sendFile(path.resolve(__dirname, "personagem.html")));
app.get("/register.html", (req, res) => res.sendFile(path.resolve(__dirname, "register.html")));
app.get("/forgot-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "forgot-password.html")));
app.get("/reset-password.html", (req, res) => res.sendFile(path.resolve(__dirname, "reset-password.html")));

/* =========================================
   HEALTH
========================================= */

app.get("/api/health", async function (req, res) {
  const postgres = await db.pingPostgres();

  res.json({
    ok: postgres.ok,
    status: "online",
    database: "postgresql",
    postgres: postgres,
  });
});

/* =========================================
   PUBLIC ADVENTURES
========================================= */

app.get("/api/adventures", async function (req, res) {
  try {
    const shadowKey = String(
      req.query.shadow || ""
    )
      .trim()
      .toLowerCase();

    const showShadow =
      shadowKey ===
      "que as sombras mostram meu destino";

    console.log(`[BRAZUG] Buscando aventuras públicas. Modo Sombra: ${showShadow}`);

    let adventures =
      await db.listAdventures(
        true,
        null
      );

    adventures = adventures.filter(
      function (a) {
        const visibility =
          String(
            a.visibility || "public"
          ).toLowerCase();

        if (showShadow) {
          return visibility === "shadow";
        }

        return visibility !== "shadow";
      }
    );

    res.json({
      adventures: adventures,
    });

  } catch (err) {
    console.error(
      "[BRAZUG] Erro crítico na rota /api/adventures:",
      err
    );

    res.status(500).json({
      error: "Erro interno ao carregar aventuras",
      details: err.message,
      adventures: [],
    });
  }
});
/* =========================================
   LIVE STREAMS
========================================= */

app.get(
  "/api/live-streams",
  async function (req, res) {
    try {
      const streams =
        await collectBrazugStreams();

      res.json(
        liveStreamsPayload(streams)
      );
    } catch (err) {
      console.error(
        "[BRAZUG] live-streams:",
        err
      );

      res.status(500).json({
        error: err.message,
        streams: [],
        ...liveStreamsPayload([]),
      });
    }
  }
);

/* =========================================
   CHARACTERS (WOW HARDCORE)
========================================= */

app.get("/api/characters", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = auth.verifyToken(token);
    
    const chars = await db.listCharacters(user);
    res.json(chars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/characters", auth.authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserByUsername(req.user.username);
    const char = await db.createCharacter(req.body, user ? user.id : null);
    res.json(char);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/characters/:id", auth.authMiddleware, async (req, res) => {
  try {
    const char = await db.updateCharacter(req.params.id, req.body, req.user);
    res.json(char);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/characters/:id", auth.authMiddleware, async (req, res) => {
  try {
    const ok = await db.deleteCharacter(req.params.id, req.user);
    res.json({ ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/characters/:id/rip", auth.authMiddleware, async (req, res) => {
  try {
    const char = await db.markCharacterAsDead(req.params.id, req.body, req.user);
    res.json(char);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   ADMIN
========================================= */

app.use(
  "/api/admin",
  adminRoutes.createAdminRouter()
);

app.use(
  "/api/auth",
  authRoutes.createAuthRouter()
);

/* =========================================
   404
========================================= */

app.use(function (req, res) {
  res.status(404).json({
    error: "Not found",
  });
});

/* =========================================
   START
========================================= */

async function start() {
  await db.init();
  await ensureAdminUser();

  const server = app.listen(
    PORT,
    "0.0.0.0",
    function () {
      console.log(
        "[BRAZUG] Express online http://0.0.0.0:" +
          PORT
      );
    }
  );

  server.on("error", function (err) {
    console.error(
      "[BRAZUG] listen error:",
      err.message
    );

    process.exit(1);
  });
}

start().catch(function (err) {
  console.error(
    "[BRAZUG] startup failed:",
    err
  );

  process.exit(1);
});

/* =========================================
   PROCESS ERRORS
========================================= */

process.on(
  "uncaughtException",
  function (err) {
    console.error(
      "[BRAZUG] uncaughtException:",
      err
    );
  }
);

process.on(
  "unhandledRejection",
  function (err) {
    console.error(
      "[BRAZUG] unhandledRejection:",
      err
    );
  }
);

process.on("SIGTERM", function () {
  db.closePool().finally(function () {
    process.exit(0);
  });
});

process.on("SIGINT", function () {
  db.closePool().finally(function () {
    process.exit(0);
  });
});