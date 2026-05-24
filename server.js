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

  return Number(process.env.PORT) || 3002;
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

const uploadsDir = path.resolve(__dirname, "data", "uploads");

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

/* =========================================
   HEALTH
========================================= */

app.get("/api/health", async function (req, res) {
  const mongo = await db.pingMongo();

  res.json({
    ok: mongo.ok,
    status: "online",
    database: "mongodb",
    mongo: mongo,
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

    const msg = String(err.message || "");
    const hint = /ssl|tls|alert number 80/i.test(msg)
      ? "Libere o IP da Hostinger no Atlas (Network Access → Add IP → Allow from anywhere 0.0.0.0/0)."
      : /enotfound|querysrv/i.test(msg)
        ? "Confira MONGODB_URI no painel Hostinger ou use MONGODB_URI_STANDARD (connection string Standard do Atlas)."
        : null;

    res.status(500).json({
      error: "Erro interno ao carregar aventuras",
      details: err.message,
      hint: hint,
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
   ADMIN
========================================= */

app.use(
  "/api/admin",
  adminRoutes.createAdminRouter()
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