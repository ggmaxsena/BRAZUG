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

CREATE TABLE IF NOT EXISTS wow_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  race TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  guild TEXT NOT NULL DEFAULT 'BRAZUG',
  image_url TEXT DEFAULT '',
  lore TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public',
  is_dead BOOLEAN NOT NULL DEFAULT FALSE,
  death_cause TEXT DEFAULT '',
  death_location TEXT DEFAULT '',
  death_level INTEGER DEFAULT NULL,
  region TEXT DEFAULT 'us',
  realm TEXT DEFAULT 'doomhowl',
  prof1_name TEXT DEFAULT '',
  prof1_300 BOOLEAN DEFAULT FALSE,
  prof2_name TEXT DEFAULT '',
  prof2_300 BOOLEAN DEFAULT FALSE,
  sec1_name TEXT DEFAULT '',
  sec1_300 BOOLEAN DEFAULT FALSE,
  sec2_name TEXT DEFAULT '',
  sec2_300 BOOLEAN DEFAULT FALSE,
  twitch_url TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id
  ON wow_characters (user_id);
CREATE INDEX IF NOT EXISTS idx_characters_visibility
  ON wow_characters (visibility);

CREATE INDEX IF NOT EXISTS idx_characters_created_at
  ON wow_characters (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adventures_event_date
  ON adventures (event_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adventures_published
  ON adventures (published);
CREATE INDEX IF NOT EXISTS idx_adventures_visibility
  ON adventures (visibility);
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
}

async function getSetting(key) {
  try {
    await init();
    const client = await getPool();
    // Ensure table exists just in case
    await client.query("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT)");
    const result = await client.query("SELECT value FROM site_settings WHERE key = $1", [key]);
    return result.rows[0] ? result.rows[0].value : null;
  } catch (err) {
    console.error("[BRAZUG] Error in getSetting:", err.message);
    throw err;
  }
}

async function setSetting(key, value) {
  try {
    await init();
    const client = await getPool();
    // Ensure table exists just in case
    await client.query("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT)");
    await client.query(
      "INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
      [key, value]
    );
    return true;
  } catch (err) {
    console.error("[BRAZUG] Error in setSetting:", err.message);
    throw err;
  }
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

async function updateUserPassword(id, hashedPassword) {
  if (!isUuid(id)) {
    return false;
  }

  await init();
  const client = await getPool();
  const result = await client.query(
    "UPDATE users SET password = $2 WHERE id = $1::uuid",
    [id, hashedPassword]
  );

  return result.rowCount > 0;
}

async function updateUser(id, data) {
  if (!isUuid(id)) return false;
  await init();
  const client = await getPool();
  
  const updates = [];
  const params = [id];
  let i = 2;

  if (data.username) {
    updates.push(`username = $${i++}`);
    params.push(data.username);
  }
  if (data.role) {
    updates.push(`role = $${i++}`);
    params.push(data.role);
  }
  if (data.password) {
    updates.push(`password = $${i++}`);
    params.push(data.password);
  }

  if (updates.length === 0) return false;

  const result = await client.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $1::uuid`,
    params
  );

  return result.rowCount > 0;
}

/* =========================================
   CRUD PERSONAGENS (WOW HARDCORE)
========================================= */

function mapCharacterRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    owner_username: row.owner_username || null,
    name: row.name || "",
    class: row.class || "",
    race: row.race || "",
    level: Number(row.level || 1),
    guild: row.guild || "BRAZUG",
    image_url: row.image_url || "",
    lore: row.lore || "",
    visibility: row.visibility || "public",
    is_dead: !!row.is_dead,
    death_cause: row.death_cause || "",
    death_location: row.death_location || "",
    death_level: row.death_level !== null ? Number(row.death_level) : null,
    region: row.region || "us",
    realm: row.realm || "doomhowl",
    prof1_name: row.prof1_name || "",
    prof1_lvl: Number(row.prof1_lvl || 0),
    prof2_name: row.prof2_name || "",
    prof2_lvl: Number(row.prof2_lvl || 0),
    prof_cooking_lvl: Number(row.prof_cooking_lvl || 0),
    prof_aid_lvl: Number(row.prof_aid_lvl || 0),
    prof_fishing_lvl: Number(row.prof_fishing_lvl || 0),
    twitch_url: row.twitch_url || "",
    youtube_url: row.youtube_url || "",
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

async function listCharacters(authenticatedUser = null) {
  await init();
  const client = await getPool();
  
  let query = `
    SELECT c.*, u.username as owner_username
    FROM wow_characters c
    LEFT JOIN users u ON c.user_id = u.id
  `;
  const params = [];

  if (!authenticatedUser) {
    query += " WHERE c.visibility = 'public'";
  } else if (authenticatedUser.role === 'admin') {
    // Admin vê tudo
  } else {
    const user = await getUserByUsername(authenticatedUser.username);
    if (user) {
      params.push(user.id);
      query += " WHERE c.visibility = 'public' OR c.user_id = $1::uuid";
    } else {
      query += " WHERE c.visibility = 'public'";
    }
  }

  query += " ORDER BY c.created_at DESC";
  
  const result = await client.query(query, params);
  return result.rows.map(mapCharacterRow);
}

async function createCharacter(data, userId = null) {
  await init();
  const client = await getPool();
  const result = await client.query(
    `INSERT INTO wow_characters (
      user_id, name, class, race, level, guild,
      image_url, lore, visibility, is_dead, death_cause,
      death_location, death_level, region, realm,
      prof1_name, prof1_lvl, prof2_name, prof2_lvl,
      prof_cooking_lvl, prof_aid_lvl, prof_fishing_lvl,
      twitch_url, youtube_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    RETURNING *`,
    [
      userId,
      String(data.name || "Sem Nome"),
      String(data.class || "Warrior"),
      String(data.race || "Orc"),
      Number(data.level || 1),
      String(data.guild || "BRAZUG"),
      String(data.image_url || ""),
      String(data.lore || ""),
      String(data.visibility || "public"),
      !!data.is_dead,
      String(data.death_cause || ""),
      String(data.death_location || ""),
      data.death_level ? Number(data.death_level) : null,
      "us",
      "doomhowl",
      String(data.prof1_name || ""), Number(data.prof1_lvl || 0),
      String(data.prof2_name || ""), Number(data.prof2_lvl || 0),
      Number(data.prof_cooking_lvl || 0),
      Number(data.prof_aid_lvl || 0),
      Number(data.prof_fishing_lvl || 0),
      String(data.twitch_url || ""),
      String(data.youtube_url || "")
    ]
  );
  return mapCharacterRow(result.rows[0]);
}

async function updateCharacter(id, data, authenticatedUser = null) {
  if (!isUuid(id)) return null;
  await init();
  
  const char = await getCharacter(id);
  if (!char) return null;

  if (authenticatedUser) {
    const isAdmin = authenticatedUser.role === 'admin';
    const user = await getUserByUsername(authenticatedUser.username);
    const isOwner = user && char.user_id === user.id;

    if (!isAdmin && !isOwner) {
      throw new Error("Sem permissão para alterar este personagem");
    }
  } else {
    throw new Error("Autenticação necessária");
  }

  const client = await getPool();
  const result = await client.query(
    `UPDATE wow_characters SET
       name = $2,
       class = $3,
       race = $4,
       level = $5,
       guild = $6,
       image_url = $7,
       lore = $8,
       visibility = $9,
       is_dead = $10,
       death_cause = $11,
       death_location = $12,
       death_level = $13,
       prof1_name = $14,
       prof1_lvl = $15,
       prof2_name = $16,
       prof2_lvl = $17,
       prof_cooking_lvl = $18,
       prof_aid_lvl = $19,
       prof_fishing_lvl = $20,
       twitch_url = $21,
       youtube_url = $22,
       updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING *`,
    [
      id,
      String(data.name || char.name),
      String(data.class || char.class),
      String(data.race || char.race),
      Number(data.level || char.level),
      String(data.guild || char.guild),
      String(data.image_url || char.image_url),
      String(data.lore || char.lore),
      String(data.visibility || char.visibility),
      data.is_dead !== undefined ? !!data.is_dead : char.is_dead,
      String(data.death_cause || char.death_cause),
      String(data.death_location || char.death_location),
      data.death_level !== undefined ? (data.death_level ? Number(data.death_level) : null) : char.death_level,
      String(data.prof1_name !== undefined ? data.prof1_name : char.prof1_name),
      Number(data.prof1_lvl !== undefined ? data.prof1_lvl : char.prof1_lvl),
      String(data.prof2_name !== undefined ? data.prof2_name : char.prof2_name),
      Number(data.prof2_lvl !== undefined ? data.prof2_lvl : char.prof2_lvl),
      Number(data.prof_cooking_lvl !== undefined ? data.prof_cooking_lvl : char.prof_cooking_lvl),
      Number(data.prof_aid_lvl !== undefined ? data.prof_aid_lvl : char.prof_aid_lvl),
      Number(data.prof_fishing_lvl !== undefined ? data.prof_fishing_lvl : char.prof_fishing_lvl),
      String(data.twitch_url !== undefined ? data.twitch_url : char.twitch_url),
      String(data.youtube_url !== undefined ? data.youtube_url : char.youtube_url)
    ]
  );
  return mapCharacterRow(result.rows[0]);
}

async function getCharacter(id) {
  if (!isUuid(id)) return null;
  await init();
  const client = await getPool();
  const result = await client.query(
    "SELECT * FROM wow_characters WHERE id = $1::uuid",
    [id]
  );
  return mapCharacterRow(result.rows[0]);
}

async function deleteCharacter(id, authenticatedUser = null) {
  if (!isUuid(id)) return false;
  await init();
  
  const char = await getCharacter(id);
  if (!char) return false;

  if (authenticatedUser) {
    const isAdmin = authenticatedUser.role === 'admin';
    const user = await getUserByUsername(authenticatedUser.username);
    const isOwner = user && char.user_id === user.id;

    if (!isAdmin && !isOwner) {
      throw new Error("Apenas o dono ou um administrador podem excluir este personagem");
    }
  } else {
    throw new Error("Autenticação necessária");
  }

  const client = await getPool();
  const result = await client.query(
    "DELETE FROM wow_characters WHERE id = $1::uuid",
    [id]
  );
  return result.rowCount > 0;
}

async function markCharacterAsDead(id, data, authenticatedUser = null) {
  if (!isUuid(id)) return false;
  await init();
  
  const char = await getCharacter(id);
  if (!char) return false;

  if (authenticatedUser) {
    const isAdmin = authenticatedUser.role === 'admin';
    const user = await getUserByUsername(authenticatedUser.username);
    const isOwner = user && char.user_id === user.id;

    if (!isAdmin && !isOwner) {
      throw new Error("Sem permissão para alterar este personagem");
    }
  } else {
    throw new Error("Autenticação necessária");
  }

  const client = await getPool();
  const result = await client.query(
    `UPDATE wow_characters SET
       is_dead = TRUE,
       death_cause = $2,
       death_location = $3,
       death_level = $4,
       updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING *`,
    [
      id,
      String(data.death_cause || ""),
      String(data.death_location || ""),
      data.death_level ? Number(data.death_level) : char.level
    ]
  );
  return mapCharacterRow(result.rows[0]);
}

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
  updateUser,
  updateUserPassword,
  listCharacters,
  createCharacter,
  updateCharacter,
  getCharacter,
  deleteCharacter,
  markCharacterAsDead,
  getSetting,
  setSetting,
  closePool,
  pingPostgres,
  postgresHostForLog,
};
