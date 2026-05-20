"use strict";

console.log(
  "[BRAZUG] boot",
  new Date().toISOString(),
  "node=" + process.version,
  "cwd=" + process.cwd()
);

const fs = require("fs");
const path = require("path");
const express = require("express");
const {
  collectBrazugStreams,
  liveStreamsPayload,
} = require("./lib/twitch.cjs");
const db = require("./lib/db.cjs");

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
    if (process.env[key]) continue;
    process.env[key] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

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
const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", function (req, res) {
  res.json({
    ok: true,
    port: PORT,
    node: process.version,
    admin: !!process.env.ADMIN_PASSWORD,
    twitch: !!(
      process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
    ),
  });
});

app.get("/api/adventures", async function (req, res) {
  try {
    const adventures = await db.listAdventures(true);
    res.json({ adventures: adventures });
  } catch (err) {
    console.error("[BRAZUG] adventures:", err.message);
    res.status(500).json({ error: err.message, adventures: [] });
  }
});

app.get("/api/live-streams", async function (req, res) {
  try {
    const streams = await collectBrazugStreams();
    res.json(liveStreamsPayload(streams));
  } catch (err) {
    console.error("[BRAZUG] live-streams:", err.message);
    res.status(500).json({
      error: err.message,
      streams: [],
      ...liveStreamsPayload([]),
    });
  }
});

app.use(express.static(__dirname));

app.use(function (req, res) {
  res.status(404).send("Not found");
});

async function start() {
  const server = app.listen(PORT, "0.0.0.0", function () {
    console.log("[BRAZUG] Express online http://0.0.0.0:" + PORT);
  });
  server.on("error", function (err) {
    console.error("[BRAZUG] listen error:", err.message);
    process.exit(1);
  });
}

start().catch(function (err) {
  console.error("[BRAZUG] startup failed:", err);
  process.exit(1);
});

process.on("uncaughtException", function (err) {
  console.error("[BRAZUG] uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", function (err) {
  console.error("[BRAZUG] unhandledRejection:", err);
});
