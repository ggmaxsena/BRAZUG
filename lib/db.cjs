"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

/* =========================================
   CONFIG
========================================= */

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return String(process.env.DATABASE_URL).trim();
  }

  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const user = process.env.POSTGRES_USER || "brazug";
  const password = process.env.POSTGRES_PASSWORD || "brazug";
  const database = process.env.POSTGRES_DB || "brazug";

  return (
    "postgresql://" +
    encodeURIComponent(user) +
    ":" +
    encodeURIComponent(password) +
    "@" +
    host +
    ":" +
    port +
    "/" +
    database
  );
}

const DATABASE_URL = buildDatabaseUrl();

let pool = null;
let schemaReady = null;

/* =========================================
   HELPERS
========================================= */

function normalizeVisibility(value) {
  const visibility = String(value || "public")
    .trim()
    .toLowerCase();

  if (visibility === "shadow" || visibility === "secret") {
    return "shadow";
  }

  return "public";
}

function normalizeInput(data) {
  return {
    title: String(data.title || "").trim(),
    body: String(data.body || "").trim(),
    author: String(data.author || "").trim(),
    image_url: String(data.image_url || "").trim(),
    image_data: data.image_data || null,
    event_date: data.event_date
      ? String(data.event_date)
      : new Date().toISOString().slice(0, 10),
    published: data.published !== false,
    visibility: normalizeVisibility(data.visibility),
  };
}

function normalizeUser(data) {
  return {
    username: String(data.username || "").trim().toLowerCase(),
    password: String(data.password || ""),
    role: String(data.role || "guildmember").toLowerCase(),
  };
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || "")
  );
}

function mapAdventureRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    title: row.title || "",
    body: row.body || "",
    author: row.author || "",
    image_url: row.image_url || "",
    image_data: row.image_data || null,
    event_date: row.event_date
      ? String(row.event_date).slice(0, 10)
      : "",
    published: row.published !== false,
    visibility: row.visibility || "public",
    created_at: row.created_at
      ? row.created_at.toISOString()
      : null,
    updated_at: row.updated_at
      ? row.updated_at.toISOString()
      : null,
  };
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    username: row.username || "",
    password: row.password || "",
    role: row.role || "guildmember",
    created_at: row.created_at
      ? row.created_at.toISOString()
      : null,
  };
}

function postgresHostForLog() {
  try {
    const u = new URL(DATABASE_URL);
    return u.hostname + ":" + (u.port || "5432") + u.pathname;
  } catch (e) {
    return "(postgresql)";
  }
}

async function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
    });
  }
  return pool;
}

function loadSchemaSql() {
  const schemaPath = path.join(
    __dirname,
    "..",
    "docker",
    "init",
    "01-schema.sql"
  );

  if (fs.existsSync(schemaPath)) {
    return fs.readFileSync(schemaPath, "utf8");
  }

  return `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS adventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_data TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guildmember',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adventures_event_date
  ON adventures (event_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adventures_published
  ON adventures (published);
CREATE INDEX IF NOT EXISTS idx_adventures_visibility
  ON adventures (visibility);
`;
}

async function runSchema() {
  const client = await getPool();
  await client.query(loadSchemaSql());
  console.log("[BRAZUG] PostgreSQL schema OK");
}

async function init() {
  if (!schemaReady) {
    schemaReady = runSchema().catch(function (err) {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

async function pingPostgres() {
  try {
    await init();
    const client = await getPool();
    await client.query("SELECT 1");
    return { ok: true, host: postgresHostForLog() };
  } catch (err) {
    return {
      ok: false,
      host: postgresHostForLog(),
      error: err.message,
    };
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}

/* =========================================
   CRUD AVENTURAS
========================================= */

async function listAdventures(publishedOnly = true, visibility = null) {
  await init();
  const client = await getPool();

  const conditions = [];
  const params = [];

  if (publishedOnly) {
    conditions.push("published = TRUE");
  }

  if (visibility !== null && visibility !== undefined) {
    params.push(normalizeVisibility(visibility));
    conditions.push("visibility = $" + params.length);
  }

  const where =
    conditions.length > 0
      ? "WHERE " + conditions.join(" AND ")
      : "";

  const result = await client.query(
    `SELECT id, title, body, author, image_url, event_date,
            published, visibility, created_at, updated_at
     FROM adventures
     ${where}
     ORDER BY event_date DESC, created_at DESC`,
    params
  );

  return result.rows.map(mapAdventureRow);
}

async function getAdventureImage(id) {
  if (!isUuid(id)) {
    return null;
  }

  await init();
  const client = await getPool();
  const result = await client.query(
    "SELECT image_data FROM adventures WHERE id = $1::uuid",
    [id]
  );

  return result.rows[0]
    ? result.rows[0].image_data
    : null;
}

async function getAdventure(id) {
  if (!isUuid(id)) {
    return null;
  }

  await init();
  const client = await getPool();
  const result = await client.query(
    "SELECT * FROM adventures WHERE id = $1::uuid",
    [id]
  );

  return mapAdventureRow(result.rows[0]);
}

async function createAdventure(data) {
  const payload = normalizeInput(data);
  await init();
  const client = await getPool();

  const result = await client.query(
    `INSERT INTO adventures (
       title, body, author, image_url, image_data,
       event_date, published, visibility
     ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8)
     RETURNING *`,
    [
      payload.title,
      payload.body,
      payload.author,
      payload.image_url,
      payload.image_data,
      payload.event_date,
      payload.published,
      payload.visibility,
    ]
  );

  return mapAdventureRow(result.rows[0]);
}

async function updateAdventure(id, data) {
  if (!isUuid(id)) {
    return null;
  }

  const payload = normalizeInput(data);
  await init();
  const client = await getPool();

  const result = await client.query(
    `UPDATE adventures SET
       title = $2,
       body = $3,
       author = $4,
       image_url = $5,
       image_data = $6,
       event_date = $7::date,
       published = $8,
       visibility = $9,
       updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING *`,
    [
      id,
      payload.title,
      payload.body,
      payload.author,
      payload.image_url,
      payload.image_data,
      payload.event_date,
      payload.published,
      payload.visibility,
    ]
  );

  return mapAdventureRow(result.rows[0]);
}

async function deleteAdventure(id) {
  if (!isUuid(id)) {
    return false;
  }

  await init();
  const client = await getPool();
  const result = await client.query(
    "DELETE FROM adventures WHERE id = $1::uuid",
    [id]
  );

  return result.rowCount > 0;
}

/* =========================================
   CRUD USUÁRIOS
========================================= */

async function getUserByUsername(username) {
  const uname = String(username || "").toLowerCase();
  await init();
  const client = await getPool();
  const result = await client.query(
    "SELECT * FROM users WHERE username = $1",
    [uname]
  );

  return mapUserRow(result.rows[0]);
}

async function createUser(data) {
  const payload = normalizeUser(data);
  await init();
  const client = await getPool();

  try {
    const result = await client.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [payload.username, payload.password, payload.role]
    );
    return mapUserRow(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      throw new Error("Usuário já existe");
    }
    throw err;
  }
}

async function listUsers() {
  await init();
  const client = await getPool();
  const result = await client.query(
    "SELECT * FROM users ORDER BY created_at ASC"
  );
  return result.rows.map(mapUserRow);
}

async function deleteUser(id) {
  if (!isUuid(id)) {
    return false;
  }

  await init();
  const client = await getPool();
  const result = await client.query(
    "DELETE FROM users WHERE id = $1::uuid",
    [id]
  );

  return result.rowCount > 0;
}

console.log("[BRAZUG] PostgreSQL:", postgresHostForLog());

/* =========================================
   EXPORTS
========================================= */

module.exports = {
  init,
  listAdventures,
  getAdventure,
  getAdventureImage,
  createAdventure,
  updateAdventure,
  deleteAdventure,
  getUserByUsername,
  createUser,
  listUsers,
  deleteUser,
  closePool,
  pingPostgres,
  postgresHostForLog,
};
