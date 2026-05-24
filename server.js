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
const adminRoutes = require("./lib/admin-routes.cjs");

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

const uploadsDir = path.join(
  __dirname,
  "data",
  "uploads"
);

try {
  fs.mkdirSync(uploadsDir, {
    recursive: true,
  });

  console.log(
    "[BRAZUG] uploads dir:",
    uploadsDir
  );
} catch (err) {
  console.error(
    "[BRAZUG] failed to create uploads dir:",
    err.message
  );
}

/* =========================================
   STATIC FILES
========================================= */

app.use(
  "/uploads",
  express.static(uploadsDir)
);

app.use(express.static(__dirname));

/* =========================================
   HEALTH
========================================= */

app.get("/api/health", function (req, res) {
  res.json({
    ok: true,

    port: PORT,

    node: process.version,

    admin: !!process.env.ADMIN_PASSWORD,

    twitch: !!(
      process.env.TWITCH_CLIENT_ID &&
      process.env.TWITCH_CLIENT_SECRET
    ),

    database: process.env.MONGODB_URI
      ? "mongodb"
      : "json",

    mongodb: !!process.env.MONGODB_URI,

    uploads: uploadsDir,
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

    /*
      IMPORTANTÍSSIMO:
      pega TODAS do banco
    */

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

        /*
          MODO SOMBRAS
        */

        if (showShadow) {
          return visibility === "shadow";
        }

        /*
          MODO NORMAL
        */

        return visibility !== "shadow";
      }
    );

    res.json({
      adventures: adventures,
    });

  } catch (err) {
    console.error(
      "[BRAZUG] adventures:",
      err.message
    );

    res.status(500).json({
      error: err.message,
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