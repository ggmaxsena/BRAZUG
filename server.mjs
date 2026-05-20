/**
 * Servidor Node (local + Hostinger VPS / Node.js hosting).
 * API: GET /api/live-streams
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectBrazugStreams, liveStreamsPayload } from "./lib/twitch.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

/** Hostinger pode passar porta como: npm start -- -p $PORT */
function resolvePort() {
  const args = process.argv;
  const i = args.indexOf("-p");
  if (i !== -1 && args[i + 1]) {
    const n = Number(args[i + 1]);
    if (n > 0) return n;
  }
  return Number(process.env.PORT) || 3000;
}

loadEnv();

const PORT = resolvePort();

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.normalize(
    path.join(__dirname, urlPath.replace(/^\//, "").replace(/\.\./g, ""))
  );

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      port: PORT,
      node: process.version,
      twitch: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
    });
    return;
  }

  if (urlPath.startsWith("/api/live-streams")) {
    try {
      const streams = await collectBrazugStreams();
      sendJson(res, 200, liveStreamsPayload(streams));
    } catch (e) {
      sendJson(res, 500, {
        error: e.message,
        streams: [],
        ...liveStreamsPayload([]),
      });
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }

  serveStatic(req, res);
});

server.on("error", (err) => {
  console.error("Erro ao iniciar servidor:", err.message);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    "[BRAZUG] online port=" +
      PORT +
      " node=" +
      process.version +
      " cwd=" +
      process.cwd()
  );
  if (!process.env.TWITCH_CLIENT_ID) {
    console.log("[BRAZUG] aviso: TWITCH_CLIENT_ID ausente (painel Hostinger ou .env)");
  }
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});
