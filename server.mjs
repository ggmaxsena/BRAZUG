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
const PORT = Number(process.env.PORT) || 3000;

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

loadEnv();

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
  if (req.url.startsWith("/api/live-streams")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const streams = await collectBrazugStreams();
      res.writeHead(200);
      res.end(JSON.stringify(liveStreamsPayload(streams)));
    } catch (e) {
      res.writeHead(500);
      res.end(
        JSON.stringify({
          error: e.message,
          streams: [],
          ...liveStreamsPayload([]),
        })
      );
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

server.listen(PORT, "0.0.0.0", () => {
  console.log("BRAZUG site: http://localhost:" + PORT);
  console.log("API Node:     http://localhost:" + PORT + "/api/live-streams");
  if (!process.env.TWITCH_CLIENT_ID) {
    console.log("Aviso: defina TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET no .env");
  }
});
