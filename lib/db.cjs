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
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const DATABASE_URL = buildDatabaseUrl();
let pool = null;
let schemaReady = null;

async function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
    });
  }
  return pool;
}

/* =========================================
   INITIALIZATION & AUTO-MIGRATION
========================================= */

async function init() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool();

      // 1. Garantir tabelas básicas
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE IF NOT EXISTS item (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          quality TEXT,
          slot TEXT,
          icon_filename TEXT,
          max_stack INTEGER DEFAULT 1,
          item_level INTEGER,
          stats_text TEXT,
          description TEXT
        );

        CREATE TABLE IF NOT EXISTS adventures (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL DEFAULT '',
          author TEXT NOT NULL DEFAULT '',
          image_url TEXT NOT NULL DEFAULT '',
          image_data TEXT,
          event_date DATE NOT NULL DEFAULT CURRENT_DATE,
          published BOOLEAN NOT NULL DEFAULT TRUE,
          is_approved BOOLEAN NOT NULL DEFAULT FALSE,
          approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS site_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS sales (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          character_id UUID REFERENCES wow_characters(id) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          item_id INTEGER REFERENCES item(id),
          price INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          duration_hours INTEGER NOT NULL CHECK (duration_hours IN (12, 24, 48)),
          ends_at TIMESTAMPTZ NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          seller_ok BOOLEAN DEFAULT FALSE,
          buyer_ok BOOLEAN DEFAULT FALSE,
          buyer_character_id UUID REFERENCES wow_characters(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS bids (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
          bidder_character_id UUID REFERENCES wow_characters(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS feedbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
          author_character_id UUID REFERENCES wow_characters(id),
          target_character_id UUID REFERENCES wow_characters(id),
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          target_role TEXT CHECK (target_role IN ('seller', 'buyer')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(sale_id, author_character_id)
        );

        CREATE TABLE IF NOT EXISTS successes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          video_url TEXT,
          video_platform TEXT,
          video_id TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS core_applications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          core_id TEXT NOT NULL,
          core_name TEXT NOT NULL,
          answers JSONB NOT NULL DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          provider_account_id TEXT NOT NULL,
          email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (provider, provider_account_id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          user_agent TEXT,
          ip TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS verification_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id UUID,
          actor_type TEXT NOT NULL DEFAULT 'user',
          action TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          metadata JSONB DEFAULT '{}',
          ip TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- ── Multi-Guild Tables ──
        CREATE TABLE IF NOT EXISTS guilds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL UNIQUE,
          guild_name TEXT NOT NULL,
          guild_icon TEXT,
          admin_role_id TEXT,
          admin_channel_id TEXT,
          stream_channel_id TEXT,
          twitch_tag TEXT DEFAULT 'brazug',
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          event_date TIMESTAMPTZ NOT NULL,
          event_type TEXT DEFAULT 'raid',
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS guild_sales (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          price INTEGER NOT NULL,
          seller_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL,
          content TEXT NOT NULL,
          author_id TEXT NOT NULL,
          channel_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS guild_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          permission TEXT NOT NULL,
          granted_by TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(guild_id, user_id, permission)
        );

        CREATE TABLE IF NOT EXISTS guild_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL,
          admin_id TEXT NOT NULL,
          admin_username TEXT,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          payload JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_events_guild ON events(guild_id);
        CREATE INDEX IF NOT EXISTS idx_guild_sales_guild ON guild_sales(guild_id);
        CREATE INDEX IF NOT EXISTS idx_announcements_guild ON announcements(guild_id);
        CREATE INDEX IF NOT EXISTS idx_guild_audit_guild ON guild_audit_log(guild_id);
        CREATE INDEX IF NOT EXISTS idx_guild_audit_created ON guild_audit_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_guild_permissions_guild ON guild_permissions(guild_id);

        REVOKE UPDATE, DELETE ON guild_audit_log FROM PUBLIC;
      `);

      // 2. Auto-Migração: Adicionar colunas que podem estar faltando
      const addColumn = async (table, column, type) => {
        try {
          await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
        } catch (e) {
          console.warn(`[DB] Not adding ${column} to ${table}: ${e.message}`);
        }
      };

      // Colunas extras de Itens
      await addColumn('item', 'max_stack', 'INTEGER DEFAULT 1');

      // Colunas extras de Usuários
      await addColumn('users', 'email', 'TEXT UNIQUE');
      await addColumn('users', 'is_verified', 'BOOLEAN DEFAULT FALSE');
      await addColumn('users', 'verification_token', 'TEXT');
      await addColumn('users', 'reset_token', 'TEXT');
      await addColumn('users', 'reset_expires', 'TIMESTAMPTZ');
      await addColumn('users', 'spotify_refresh_token', 'TEXT');
      await addColumn('users', 'verification_expires', 'TIMESTAMPTZ');

      // Colunas extras de Aventuras
      await addColumn('adventures', 'user_id', 'UUID REFERENCES users(id) ON DELETE SET NULL');
      await addColumn('adventures', 'is_approved', 'BOOLEAN NOT NULL DEFAULT FALSE');
      await addColumn('adventures', 'approved_by', 'UUID REFERENCES users(id) ON DELETE SET NULL');
      await addColumn('adventures', 'video_url', "TEXT DEFAULT ''");
      await addColumn('adventures', 'video_platform', "TEXT");
      await addColumn('adventures', 'video_id', "TEXT");

      // Colunas extras de Personagens
      await addColumn('wow_characters', 'image_url', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'lore', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
      await addColumn('wow_characters', 'is_dead', "BOOLEAN NOT NULL DEFAULT FALSE");
      await addColumn('wow_characters', 'death_cause', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'death_location', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'death_level', "INTEGER DEFAULT NULL");
      await addColumn('wow_characters', 'region', "TEXT DEFAULT 'us'");
      await addColumn('wow_characters', 'realm', "TEXT DEFAULT 'doomhowl'");
      await addColumn('wow_characters', 'prof1_name', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'prof1_lvl', "INTEGER DEFAULT 0");
      await addColumn('wow_characters', 'prof2_name', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'prof2_lvl', "INTEGER DEFAULT 0");
      await addColumn('wow_characters', 'prof_cooking_lvl', "INTEGER DEFAULT 0");
      await addColumn('wow_characters', 'prof_aid_lvl', "INTEGER DEFAULT 0");
      await addColumn('wow_characters', 'prof_fishing_lvl', "INTEGER DEFAULT 0");
      await addColumn('wow_characters', 'twitch_url', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'youtube_url', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'video_url', "TEXT DEFAULT ''");
      await addColumn('wow_characters', 'video_platform', "TEXT");
      await addColumn('wow_characters', 'video_id', "TEXT");
      await addColumn('wow_characters', 'sheet', "JSONB NOT NULL DEFAULT '{}'::jsonb");

      // Colunas extras de Vendas
      await addColumn('sales', 'item_id', 'INTEGER REFERENCES item(id)');
      await addColumn('sales', 'description', 'TEXT');
      await addColumn('sales', 'quantity', 'INTEGER DEFAULT 1');
      await addColumn('sales', 'duration_hours', 'INTEGER DEFAULT 24');
      await addColumn('sales', 'ends_at', 'TIMESTAMPTZ DEFAULT NOW() + INTERVAL \'24 hours\'');
      await addColumn('sales', 'seller_ok', 'BOOLEAN DEFAULT FALSE');
      await addColumn('sales', 'buyer_ok', 'BOOLEAN DEFAULT FALSE');
      await addColumn('sales', 'buyer_character_id', 'UUID REFERENCES wow_characters(id)');
      await addColumn('sales', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

      // Colunas extras de Sucessos
      await addColumn('successes', 'video_url', 'TEXT');
      await addColumn('successes', 'video_platform', 'TEXT');
      await addColumn('successes', 'video_id', 'TEXT');

      console.log("[BRAZUG] Database structure verified and updated.");
    })();
  }
  await schemaReady;
}

/* =========================================
   MAPPERS
========================================= */

function mapAdventureRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    title: row.title || "",
    body: row.body || "",
    author: row.author || "",
    image_url: row.image_url || "",
    image_data: row.image_data || null,
    event_date: row.event_date ? new Date(row.event_date).toISOString().split('T')[0] : "",
    published: !!row.published,
    is_approved: !!row.is_approved,
    approved_by: row.approved_by ? String(row.approved_by) : null,
    visibility: row.visibility || "public",
    video_url: row.video_url || "",
    video_platform: row.video_platform || null,
    video_id: row.video_id || null,
    created_at: row.created_at ? row.created_at.toISOString() : null
  };
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    username: row.username || "",
    email: row.email || "",
    role: row.role || "guildmember",
    is_verified: !!row.is_verified,
    created_at: row.created_at ? row.created_at.toISOString() : null
  };
}

function mapCharacterRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
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
    realm: row.realm || "doomhowl",
    user_id: row.user_id ? String(row.user_id) : null,
    owner_username: row.owner_username || null,
    prof1_name: row.prof1_name || "",
    prof1_lvl: Number(row.prof1_lvl || 0),
    prof2_name: row.prof2_name || "",
    prof2_lvl: Number(row.prof2_lvl || 0),
    prof_cooking_lvl: Number(row.prof_cooking_lvl || 0),
    prof_aid_lvl: Number(row.prof_aid_lvl || 0),
    prof_fishing_lvl: Number(row.prof_fishing_lvl || 0),
    twitch_url: row.twitch_url || "",
    youtube_url: row.youtube_url || "",
    video_url: row.video_url || "",
    video_platform: row.video_platform || null,
    video_id: row.video_id || null,
    sheet: row.sheet && typeof row.sheet === "object" ? row.sheet : {}
  };
}

/* =========================================
   ADVENTURES CRUD
========================================= */

async function listAdventures(publishedOnly = true) {
  await init();
  const client = await getPool();

  // Compatibilidade: algumas bases antigas podem não ter coluna is_approved.
  // Se não existir, caímos para filtro apenas por published.
  let where = "";
  try {
    // information_schema sempre encontra com nome de coluna exato
    const chk = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'adventures' AND column_name = 'is_approved'"
    );

    const hasIsApproved = chk.rowCount > 0;

    if (publishedOnly) {
      where = hasIsApproved
        ? "WHERE published = TRUE AND is_approved = TRUE"
        : "WHERE published = TRUE";
    }
  } catch (e) {
    // Se falhar a consulta de schema, usa fallback simples
    where = publishedOnly ? "WHERE published = TRUE" : "";
  }

  const res = await client.query(
    `SELECT * FROM adventures ${where} ORDER BY event_date DESC, created_at DESC`
  );
  return res.rows.map(mapAdventureRow);
}

async function getAdventure(id) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT * FROM adventures WHERE id = $1::uuid", [id]);
  return mapAdventureRow(res.rows[0]);
}

async function createAdventure(data, userId = null, autoApprove = false) {
  await init();
  const client = await getPool();

  const video = extractVideoData(data.video_url);

  const res = await client.query(
    `INSERT INTO adventures (user_id, title, body, author, image_url, image_data, event_date, published, is_approved, approved_by, visibility, video_url, video_platform, video_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [userId, data.title, data.body, data.author, data.image_url, data.image_data, data.event_date || new Date(), data.published !== false, autoApprove, autoApprove ? userId : null, data.visibility || 'public', data.video_url || '', video.platform, video.id]
  );
  return mapAdventureRow(res.rows[0]);
}

async function approveAdventure(id, approvedByUserId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    "UPDATE adventures SET is_approved = TRUE, approved_by = $2, updated_at = NOW() WHERE id = $1::uuid RETURNING *",
    [id, approvedByUserId]
  );
  return mapAdventureRow(res.rows[0]);
}

async function updateAdventure(id, data, authenticatedUser = null) {
  await init();
  const client = await getPool();

  if (!authenticatedUser) return null;

  const user = await getUserByUsername(authenticatedUser.username);
  if (!user) return null;

  const video = extractVideoData(data.video_url);

  const isStaff = ["admin", "guildmaster", "officer"].includes(authenticatedUser.role);

  let query = "";
  let params = [];

  if (isStaff) {
    query = `UPDATE adventures SET title=$2, body=$3, author=$4, image_url=$5, image_data=$6, event_date=$7::date, published=$8, visibility=$9, video_url=$10, video_platform=$11, video_id=$12, updated_at=NOW()
             WHERE id=$1::uuid RETURNING *`;
    params = [id, data.title, data.body, data.author, data.image_url, data.image_data, data.event_date, data.published, data.visibility, data.video_url, video.platform, video.id];
  } else {
    query = `UPDATE adventures SET title=$2, body=$3, author=$4, image_url=$5, image_data=$6, event_date=$7::date, published=$8, visibility=$9, video_url=$10, video_platform=$11, video_id=$12, updated_at=NOW()
             WHERE id=$1::uuid AND user_id=$13 RETURNING *`;
    params = [id, data.title, data.body, data.author, data.image_url, data.image_data, data.event_date, data.published, data.visibility, data.video_url, video.platform, video.id, user.id];
  }

  const res = await client.query(query, params);
  return res.rows[0] ? mapAdventureRow(res.rows[0]) : null;
}

async function deleteAdventure(id, authenticatedUser = null) {
  await init();
  const client = await getPool();

  if (!authenticatedUser) return false;

  const user = await getUserByUsername(authenticatedUser.username);
  if (!user) return false;

  let query = "";
  let params = [];

  if (authenticatedUser.role === "admin") {
    query = "DELETE FROM adventures WHERE id = $1::uuid";
    params = [id];
  } else {
    query = "DELETE FROM adventures WHERE id = $1::uuid AND user_id = $2";
    params = [id, user.id];
  }

  const res = await client.query(query, params);
  return res.rowCount > 0;
}

/* =========================================
   USERS CRUD
========================================= */

async function getUserByUsername(username) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1)", [username]);
  if (!res.rows[0]) return null;
  return { ...mapUserRow(res.rows[0]), password: res.rows[0].password };
}

async function getUserById(id) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT * FROM users WHERE id = $1::uuid", [id]);
  return mapUserRow(res.rows[0]);
}

async function createUser(data) {
  await init();
  const client = await getPool();
  try {
    const res = await client.query(
      "INSERT INTO users (username, password, role, email, verification_token, verification_expires) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        String(data.username || "").trim().toLowerCase(),
        data.password,
        data.role || "guildmember",
        data.email ? String(data.email).trim().toLowerCase() : null,
        data.verification_token || null,
        data.verification_expires || null
      ]
    );
    return mapUserRow(res.rows[0]);
  } catch (err) {
    if (err.code === "23505") throw new Error("Usuário ou e-mail já existe");
    throw err;
  }
}

async function listUsers() {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT * FROM users ORDER BY created_at DESC");
  return res.rows.map(mapUserRow);
}

async function updateUser(id, data) {
  await init();
  const client = await getPool();
  const fields = [];
  const values = [id];
  let i = 2;
  if (data.username) { fields.push(`username = $${i++}`); values.push(data.username.toLowerCase()); }
  if (data.email) { fields.push(`email = $${i++}`); values.push(data.email); }
  if (data.role) { fields.push(`role = $${i++}`); values.push(data.role); }
  if (data.password) { fields.push(`password = $${i++}`); values.push(data.password); }
  if (data.is_verified !== undefined) { fields.push(`is_verified = $${i++}`); values.push(data.is_verified); }
  if (data.verification_token !== undefined) { fields.push(`verification_token = $${i++}`); values.push(data.verification_token); }

  if (fields.length === 0) return null;

  const res = await client.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $1::uuid RETURNING *`, values);
  return mapUserRow(res.rows[0]);
}

async function updateUserPassword(id, hashedPassword) {
  await init();
  const client = await getPool();
  await client.query("UPDATE users SET password = $2 WHERE id = $1::uuid", [id, hashedPassword]);
  return true;
}

async function deleteUser(id) {
  await init();
  const client = await getPool();
  await client.query("DELETE FROM users WHERE id = $1::uuid", [id]);
  return true;
}

async function verifyUser(token) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `UPDATE users SET is_verified = TRUE, verification_token = NULL
     WHERE verification_token = $1
       AND (verification_expires IS NULL OR verification_expires > NOW())
     RETURNING *`,
    [token]
  );
  return mapUserRow(res.rows[0]);
}

async function getUserByEmail(email) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
  if (!res.rows[0]) return null;
  return { ...mapUserRow(res.rows[0]), password: res.rows[0].password };
}

async function setResetToken(email, token, expires) {
  await init();
  const client = await getPool();
  await client.query("UPDATE users SET reset_token = $2, reset_expires = $3 WHERE LOWER(email) = LOWER($1)", [email, token, expires]);
  return true;
}

async function getUserByResetToken(token) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()", [token]);
  if (!res.rows[0]) return null;
  return mapUserRow(res.rows[0]);
}

async function resetPassword(token, hashedPassword) {
  await init();
  const client = await getPool();
  await client.query("UPDATE users SET password = $2, reset_token = NULL, reset_expires = NULL WHERE reset_token = $1", [token, hashedPassword]);
  return true;
}

/* =========================================
   CHARACTERS CRUD
========================================= */

async function listCharacters(authenticatedUser = null) {
  await init();
  const client = await getPool();
  let query = "SELECT c.*, u.username as owner_username FROM wow_characters c LEFT JOIN users u ON c.user_id = u.id";
  const params = [];
  if (!authenticatedUser || authenticatedUser.role !== 'admin') {
    query += " WHERE c.visibility = 'public'";
    if (authenticatedUser) {
      const user = await getUserByUsername(authenticatedUser.username);
      if (user) { params.push(user.id); query += " OR c.user_id = $1::uuid"; }
    }
  }
  const res = await client.query(query + " ORDER BY c.created_at DESC", params);
  return res.rows.map(mapCharacterRow);
}

async function getCharacterByName(name, realm = 'doomhowl') {
  await init();
  const client = await getPool();
  // Prioriza personagens VIVOS se houver duplicidade de nome
  const res = await client.query(
    `SELECT c.*, u.username as owner_username 
     FROM wow_characters c 
     LEFT JOIN users u ON c.user_id = u.id 
     WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.realm) = LOWER($2) 
     ORDER BY c.is_dead ASC, c.created_at DESC LIMIT 1`,
    [name, realm]
  );
  return mapCharacterRow(res.rows[0]);
}

async function getCharacterById(id) {
  await init();
  const client = await getPool();
  const res = await client.query(
    "SELECT c.*, u.username as owner_username FROM wow_characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1::uuid LIMIT 1",
    [id]
  );
  return mapCharacterRow(res.rows[0]);
}

async function createCharacter(data, userId = null) {
  await init();
  const client = await getPool();

  const video = extractVideoData(data.video_url);

  const res = await client.query(
    `INSERT INTO wow_characters (user_id, name, class, race, level, guild, image_url, lore, visibility, realm, region, twitch_url, youtube_url, video_url, video_platform, video_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [userId, data.name, data.class, data.race, data.level || 1, data.guild || 'BRAZUG', data.image_url, data.lore, data.visibility || 'public', data.realm || 'doomhowl', data.region || 'us', data.twitch_url || '', data.youtube_url || '', data.video_url || '', video.platform, video.id]
  );
  return mapCharacterRow(res.rows[0]);
}

async function updateCharacter(id, data, authenticatedUser = null) {
  await init();
  const client = await getPool();

  // Verificação de permissão
  if (!authenticatedUser) return null;

  const user = await getUserByUsername(authenticatedUser.username);
  if (!user) return null;

  const video = extractVideoData(data.video_url);
  console.log(`[VIDEO-DEBUG] URL: ${data.video_url} -> Platform: ${video.platform}, ID: ${video.id}`);

  let query = "";
  let params = [];

  if (authenticatedUser.role === "admin") {
    query = `UPDATE wow_characters SET name=$2, class=$3, race=$4, level=$5, guild=$6, image_url=$7, lore=$8, visibility=$9, is_dead=$10, twitch_url=$11, youtube_url=$12, video_url=$13, video_platform=$14, video_id=$15, realm=$16, updated_at=NOW()
                 WHERE id=$1::uuid RETURNING *`;
    params = [id, data.name, data.class, data.race, data.level, data.guild, data.image_url, data.lore, data.visibility, data.is_dead, data.twitch_url || '', data.youtube_url || '', data.video_url || '', video.platform, video.id, data.realm || 'doomhowl'];
  } else {
    query = `UPDATE wow_characters SET name=$2, class=$3, race=$4, level=$5, guild=$6, image_url=$7, lore=$8, visibility=$9, is_dead=$10, twitch_url=$11, youtube_url=$12, video_url=$13, video_platform=$14, video_id=$15, realm=$16, updated_at=NOW()
                 WHERE id=$1::uuid AND user_id=$17 RETURNING *`;
    params = [id, data.name, data.class, data.race, data.level, data.guild, data.image_url, data.lore, data.visibility, data.is_dead, data.twitch_url || '', data.youtube_url || '', data.video_url || '', video.platform, video.id, data.realm || 'doomhowl', user.id];
  }

  const res = await client.query(query, params);
  return res.rows[0] ? mapCharacterRow(res.rows[0]) : null;
}

function extractVideoData(url) {
  if (!url) return { platform: null, id: null };

  // YouTube Regex
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|u\/\w\/|shorts\/))([^#\&\?]*)/);
  if (ytMatch && ytMatch[1].length === 11) {
    return { platform: 'youtube', id: ytMatch[1] };
  }

  // Twitch Regex (Videos and Clips)
  const twitchVideoMatch = url.match(/twitch\.tv\/videos\/([0-9]+)/);
  if (twitchVideoMatch) return { platform: 'twitch', id: twitchVideoMatch[1] };

  const twitchClipMatch = url.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)([a-zA-Z0-9_-]+)/);
  if (twitchClipMatch) return { platform: 'twitch_clip', id: twitchClipMatch[1] };

  // Twitch Channel fallback
  const twitchChannelMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchChannelMatch) return { platform: 'twitch_channel', id: twitchChannelMatch[1] };

  return { platform: null, id: null };
}

async function markCharacterAsDead(id, data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `UPDATE wow_characters SET is_dead=TRUE, death_cause=$2, death_location=$3, death_level=$4, updated_at=NOW()
         WHERE id=$1::uuid RETURNING *`,
    [id, data.death_cause, data.death_location, data.death_level]
  );
  return mapCharacterRow(res.rows[0]);
}

async function deleteCharacter(id, authenticatedUser = null) {
  await init();
  const client = await getPool();

  if (!authenticatedUser) return false;

  const user = await getUserByUsername(authenticatedUser.username);
  if (!user) return false;

  let query = "";
  let params = [];

  if (authenticatedUser.role === "admin") {
    query = "DELETE FROM wow_characters WHERE id = $1::uuid";
    params = [id];
  } else {
    query = "DELETE FROM wow_characters WHERE id = $1::uuid AND user_id = $2";
    params = [id, user.id];
  }

  const res = await client.query(query, params);
  return res.rowCount > 0;
}

/* =========================================
   ARMORY (SAFE INTEGRATION)
========================================= */

async function getFullArmoryCharacter(name, realm) {
  await init();
  const client = await getPool();
  try {
    const charRes = await client.query('SELECT * FROM armory."Character" WHERE LOWER(name) = LOWER($1) AND LOWER(realm) = LOWER($2) LIMIT 1', [name, realm]);
    if (!charRes.rows[0]) return null;
    const char = charRes.rows[0];

    let items = [];
    try {
      const r = await client.query(`
        SELECT ci.*, i.name as item_name, i.quality as item_quality, i.icon as item_icon, i.tooltip_data
        FROM armory."CharacterItem" ci 
        LEFT JOIN armory."Item" i ON ci.item_id = i.id 
        WHERE ci.character_id = $1
      `, [char.id]);
      items = r.rows;
    } catch (e) { console.error("[DB] Error joining items:", e.message); }

    let professions = [];
    try { const r = await client.query('SELECT * FROM armory."CharacterProfession" WHERE character_id = $1', [char.id]); professions = r.rows; } catch (e) { }

    const profile = await getCharacterByName(name, realm);

    // Prioridade: Imagem do perfil (usuário) > Imagem da Blizzard (armory)
    const finalAvatar = (profile && profile.image_url) ? profile.image_url : char.avatarUrl;

    // Garantir que extra_data seja acessível e armory ID não seja sobrescrito
    return {
      ...char,
      armory_id: char.id,
      items,
      professions,
      profile,
      avatarUrl: finalAvatar || '/assets/branding/contentbra.png'
    };
  } catch (err) {
    console.error("[DB] Armory fetch failed:", err.message);
    return null;
  }
}

async function searchArmoryItems(query, limit = 20, slotTypes = null) {
  await init();
  const client = await getPool();
  try {
    let sql = `SELECT * FROM armory."Item" WHERE LOWER(name) LIKE LOWER($1)`;
    const params = [`%${query}%`];

    if (slotTypes && slotTypes.length > 0) {
      sql += ` AND (tooltip_data->'inventory_type'->>'type' = ANY($2::text[]))`;
      params.push(slotTypes);
    }

    sql += ` ORDER BY quality DESC, name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await client.query(sql, params);
    return res.rows;
  } catch (err) {
    console.error("[DB] Item search failed:", err.message);
    return [];
  }
}

async function getArmoryItem(id) {
  await init();
  const client = await getPool();
  try {
    const res = await client.query('SELECT * FROM armory."Item" WHERE id = $1', [id]);
    return res.rows[0];
  } catch (err) {
    console.error("[DB] Item fetch failed:", err.message);
    return null;
  }
}

async function searchGroupedItems(filters = {}) {
  await init();
  const client = await getPool();

  let query = `
        SELECT 
            s.item_id, 
            i.name as item_name, 
            i.quality,
            MIN(s.price::numeric / s.quantity::numeric) as min_price_unit,
            SUM(s.quantity) as total_available,
            COUNT(s.id) as total_listings
        FROM sales s
        LEFT JOIN item i ON s.item_id = i.id
        WHERE s.status = 'open'
    `;
  const params = [];
  let i = 1;

  if (filters.name) {
    query += ` AND LOWER(i.name) LIKE LOWER($${i++})`;
    params.push(`%${filters.name}%`);
  }
  // Adicionar outros filtros conforme necessário (min_lvl, quality, etc)

  query += ` GROUP BY s.item_id, i.name, i.quality ORDER BY min_price_unit ASC`;

  const res = await client.query(query, params);
  return res.rows;
}

/* =========================================
   SALES CRUD
========================================= */

async function listSales(filters = {}) {
  await init();
  const client = await getPool();

  let query = `
        SELECT s.*, i.quality, i.slot as category, c.name as seller_name
        FROM sales s 
        LEFT JOIN item i ON s.item_id = i.id
        LEFT JOIN wow_characters c ON s.character_id = c.id
        WHERE 1=1
    `;
  const params = [];
  let i = 1;

  if (filters.name) {
    query += ` AND LOWER(s.item_name) LIKE LOWER($${i++})`;
    params.push(`%${filters.name}%`);
  }
  if (filters.item_id) {
    query += ` AND s.item_id = $${i++}`;
    params.push(filters.item_id);
  }
  if (filters.quality) {
    query += ` AND LOWER(i.quality) = LOWER($${i++})`;
    params.push(filters.quality);
  }
  if (filters.category) {
    query += ` AND LOWER(i.slot) = LOWER($${i++})`;
    params.push(filters.category);
  }

  query += ` ORDER BY s.created_at DESC`;

  const res = await client.query(query, params);
  return res.rows;
}

async function createSale(data, authenticatedUser) {
  await init();
  const client = await getPool();

  // Verifica se o personagem pertence ao usuário
  const char = await client.query("SELECT id FROM wow_characters WHERE id = $1 AND user_id = $2", [data.character_id, authenticatedUser.id]);
  if (char.rowCount === 0 && authenticatedUser.role !== 'admin') throw new Error("Não autorizado");

  // Calcula a data de término com base na duração escolhida
  const endsAt = new Date();
  endsAt.setHours(endsAt.getHours() + parseInt(data.duration_hours));

  const res = await client.query(
    `INSERT INTO sales (character_id, item_name, item_id, price, quantity, duration_hours, ends_at, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      data.character_id,
      data.item_name,
      data.item_id,
      data.price,
      data.quantity,
      data.duration_hours,
      endsAt,
      data.description
    ]
  );
  return res.rows[0];
}

async function listSalesByCharacter(characterId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT s.*, i.quality, i.icon_filename
         FROM sales s 
         LEFT JOIN item i ON s.item_id = i.id
         WHERE s.character_id = $1 
         ORDER BY s.created_at DESC`,
    [characterId]
  );
  return res.rows;
}

async function deleteSale(id, authenticatedUser) {
  await init();
  const client = await getPool();

  let query = "";
  let params = [];

  if (authenticatedUser.role === "admin") {
    query = "DELETE FROM sales WHERE id = $1::uuid";
    params = [id];
  } else {
    // Valida que a venda pertence a um personagem do usuário
    query = `DELETE FROM sales WHERE id = $1::uuid 
                 AND character_id IN (SELECT id FROM wow_characters WHERE user_id = $2)`;
    params = [id, authenticatedUser.id];
  }

  const res = await client.query(query, params);
  return res.rowCount > 0;
}

async function acceptSale(saleId, bidderCharacterId, authenticatedUser) {
  await init();
  const client = await getPool();

  // Valida que a venda pertence a um personagem do usuário
  const res = await client.query(`
        UPDATE sales 
        SET status = 'accepted', buyer_character_id = $2, updated_at = NOW() 
        WHERE id = $1::uuid 
        AND character_id IN (SELECT id FROM wow_characters WHERE user_id = $3)
        RETURNING *`,
    [saleId, bidderCharacterId, authenticatedUser.id]
  );
  return res.rows[0];
}

async function purchaseSale(saleId, buyerCharacterId, authenticatedUser) {
  await init();
  const client = await getPool();

  // Verifica se o personagem comprador pertence ao usuário
  const buyerChar = await client.query("SELECT user_id FROM wow_characters WHERE id = $1", [buyerCharacterId]);
  if (buyerChar.rowCount === 0) throw new Error("Personagem comprador não encontrado");
  if (buyerChar.rows[0].user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') throw new Error("Personagem não autorizado");

  // Verifica se o vendedor é o mesmo usuário que está comprando
  const saleRes = await client.query(
    `SELECT s.character_id, c.user_id as seller_user_id 
         FROM sales s 
         JOIN wow_characters c ON s.character_id = c.id 
         WHERE s.id = $1::uuid`,
    [saleId]
  );
  if (saleRes.rowCount === 0) throw new Error("Venda não encontrada");

  if (saleRes.rows[0].seller_user_id === authenticatedUser.id && authenticatedUser.role !== 'admin') {
    throw new Error("Você não pode comprar seus próprios itens.");
  }

  // Marca a venda como 'sold' e registra o comprador
  const res = await client.query(`
        UPDATE sales 
        SET status = 'sold', buyer_character_id = $2, updated_at = NOW() 
        WHERE id = $1::uuid AND status = 'open'
        RETURNING *`,
    [saleId, buyerCharacterId]
  );
  return res.rows[0];
}

async function createBid(data, authenticatedUser) {
  await init();
  const client = await getPool();

  // Verifica se o personagem do lance pertence ao usuário
  const char = await client.query("SELECT id FROM wow_characters WHERE id = $1 AND user_id = $2", [data.bidder_character_id, authenticatedUser.id]);
  if (char.rowCount === 0 && authenticatedUser.role !== 'admin') throw new Error("Não autorizado");

  const res = await client.query(
    `INSERT INTO bids (sale_id, bidder_character_id, amount)
         VALUES ($1, $2, $3) RETURNING *`,
    [data.sale_id, data.bidder_character_id, data.amount]
  );
  return res.rows[0];
}

async function listBids(saleId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT b.*, c.name as bidder_name 
         FROM bids b 
         LEFT JOIN wow_characters c ON b.bidder_character_id = c.id 
         WHERE b.sale_id = $1 
         ORDER BY b.amount DESC, b.created_at ASC`,
    [saleId]
  );
  return res.rows;
}

/* =========================================
   HISTORY & FEEDBACK
========================================= */

async function listSalesHistory(characterId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT s.*, 
                i.quality, i.icon_filename,
                sc.name as seller_name,
                bc.name as buyer_name,
                (SELECT rating FROM feedbacks WHERE sale_id = s.id AND author_character_id = $1) as my_feedback_rating
         FROM sales s
         LEFT JOIN item i ON s.item_id = i.id
         LEFT JOIN wow_characters sc ON s.character_id = sc.id
         LEFT JOIN wow_characters bc ON s.buyer_character_id = bc.id
         WHERE (s.character_id = $1 OR s.buyer_character_id = $1)
         AND s.status = 'sold'
         ORDER BY s.updated_at DESC`,
    [characterId]
  );
  return res.rows;
}

async function createFeedback(data, authenticatedUser) {
  await init();
  const client = await getPool();

  // Validate author ownership
  const char = await client.query("SELECT id FROM wow_characters WHERE id = $1 AND user_id = $2", [data.author_character_id, authenticatedUser.id]);
  if (char.rowCount === 0 && authenticatedUser.role !== 'admin') throw new Error("Personagem autor não autorizado");

  // Get sale info to determine target
  const saleRes = await client.query("SELECT * FROM sales WHERE id = $1", [data.sale_id]);
  if (saleRes.rowCount === 0) throw new Error("Venda não encontrada");
  const sale = saleRes.rows[0];

  let target_character_id;
  let target_role;

  if (String(sale.character_id) === String(data.author_character_id)) {
    // Author is seller, target is buyer
    target_character_id = sale.buyer_character_id;
    target_role = 'buyer';
  } else if (String(sale.buyer_character_id) === String(data.author_character_id)) {
    // Author is buyer, target is seller
    target_character_id = sale.character_id;
    target_role = 'seller';
  } else {
    throw new Error("Você não participou desta negociação");
  }

  if (!target_character_id) throw new Error("Negociação ainda não concluída");

  try {
    const res = await client.query(
      `INSERT INTO feedbacks (sale_id, author_character_id, target_character_id, rating, comment, target_role)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.sale_id, data.author_character_id, target_character_id, data.rating, data.comment, target_role]
    );
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') throw new Error("Você já enviou uma avaliação para esta negociação.");
    throw err;
  }
}

async function getCharacterReputation(characterId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT 
            AVG(rating)::numeric(3,2) as average_rating,
            COUNT(*) as total_feedbacks
         FROM feedbacks 
         WHERE target_character_id = $1`,
    [characterId]
  );
  return res.rows[0];
}

async function listFeedbacksForCharacter(characterId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT f.*, c.name as author_name, s.item_name
         FROM feedbacks f
         LEFT JOIN wow_characters c ON f.author_character_id = c.id
         LEFT JOIN sales s ON f.sale_id = s.id
         WHERE f.target_character_id = $1
         ORDER BY f.created_at DESC`,
    [characterId]
  );
  return res.rows;
}

/* =========================================
   HELPERS & SETTINGS
========================================= */

async function getSetting(key) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT value FROM site_settings WHERE key = $1", [key]);
  return res.rows[0] ? res.rows[0].value : null;
}

async function setSetting(key, value) {
  await init();
  const client = await getPool();
  await client.query("INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2", [key, value]);
  return true;
}

async function setSpotifyRefreshToken(userId, token) {
  await init();
  const client = await getPool();
  await client.query("UPDATE users SET spotify_refresh_token = $2 WHERE id = $1::uuid", [userId, token]);
  return true;
}

async function getSpotifyRefreshToken(userId) {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT spotify_refresh_token FROM users WHERE id = $1::uuid", [userId]);
  return res.rows[0] ? res.rows[0].spotify_refresh_token : null;
}

/* =========================================
   SUCCESSES CRUD
========================================= */

async function listSuccesses() {
  await init();
  const client = await getPool();
  const res = await client.query("SELECT s.*, u.username as creator_username FROM successes s LEFT JOIN users u ON s.created_by = u.id ORDER BY s.created_at DESC");
  return res.rows;
}

async function createSuccess(data, user) {
  await init();
  const client = await getPool();
  const video = extractVideoData(data.video_url);

  const res = await client.query(
    "INSERT INTO successes (title, description, image_url, video_url, video_platform, video_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [data.title, data.description, data.image_url, data.video_url || '', video.platform, video.id, user.id]
  );
  return res.rows[0];
}

async function updateSuccess(id, data, user) {
  await init();
  const client = await getPool();
  const video = extractVideoData(data.video_url);

  const res = await client.query(
    "UPDATE successes SET title = $2, description = $3, image_url = $4, video_url = $5, video_platform = $6, video_id = $7 WHERE id = $1::uuid RETURNING *",
    [id, data.title, data.description, data.image_url, data.video_url || '', video.platform, video.id]
  );
  return res.rows[0];
}

async function deleteSuccess(id) {
  await init();
  const client = await getPool();
  const res = await client.query("DELETE FROM successes WHERE id = $1::uuid", [id]);
  return res.rowCount > 0;
}

/* =========================================
   CORE APPLICATIONS CRUD
========================================= */

function mapCoreApplicationRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    username: row.username || null,
    core_id: row.core_id || "",
    core_name: row.core_name || "",
    answers: row.answers || {},
    status: row.status || "pending",
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null
  };
}

async function createCoreApplication(userId, data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO core_applications (user_id, core_id, core_name, answers)
     VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
    [userId, data.core_id, data.core_name, JSON.stringify(data.answers || {})]
  );
  return mapCoreApplicationRow(res.rows[0]);
}

async function listCoreApplications(filters = {}) {
  await init();
  const client = await getPool();
  let query = `SELECT ca.*, u.username
               FROM core_applications ca
               LEFT JOIN users u ON ca.user_id = u.id
               WHERE 1=1`;
  const params = [];
  let i = 1;

  if (filters.core_id) {
    query += ` AND ca.core_id = $${i++}`;
    params.push(filters.core_id);
  }
  if (filters.status) {
    query += ` AND ca.status = $${i++}`;
    params.push(filters.status);
  }
  if (filters.user_id) {
    query += ` AND ca.user_id = $${i++}::uuid`;
    params.push(filters.user_id);
  }

  query += ` ORDER BY ca.created_at DESC`;
  const res = await client.query(query, params);
  return res.rows.map(mapCoreApplicationRow);
}

async function getCoreApplication(id) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT ca.*, u.username FROM core_applications ca
     LEFT JOIN users u ON ca.user_id = u.id
     WHERE ca.id = $1::uuid`,
    [id]
  );
  return mapCoreApplicationRow(res.rows[0]);
}

async function updateCoreApplicationStatus(id, status) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `UPDATE core_applications SET status = $2, updated_at = NOW() WHERE id = $1::uuid RETURNING *`,
    [id, status]
  );
  return mapCoreApplicationRow(res.rows[0]);
}

async function deleteCoreApplication(id) {
  await init();
  const client = await getPool();
  const res = await client.query("DELETE FROM core_applications WHERE id = $1::uuid", [id]);
  return res.rowCount > 0;
}

async function createSession(data) {
  await init();
  const client = await getPool();
  await client.query("DELETE FROM sessions WHERE expires_at < NOW()");
  await client.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.userId, data.tokenHash, data.expiresAt, data.userAgent || null, data.ip || null]
  );
  return true;
}

async function getUserBySessionToken(tokenHash) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return mapUserRow(res.rows[0]);
}

async function deleteSession(tokenHash) {
  await init();
  const client = await getPool();
  await client.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  return true;
}

async function createAuthToken(data) {
  await init();
  const client = await getPool();
  await client.query(
    "DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2",
    [data.userId, data.type]
  );
  await client.query(
    `INSERT INTO verification_tokens (user_id, token_hash, type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [data.userId, data.tokenHash, data.type, data.expiresAt]
  );
  return true;
}

async function consumeAuthToken(tokenHash, type) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `DELETE FROM verification_tokens
     WHERE token_hash = $1 AND type = $2 AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash, type]
  );
  return res.rows[0] ? String(res.rows[0].user_id) : null;
}

async function getAccount(provider, providerAccountId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT a.*, u.username, u.role, u.email, u.is_verified
     FROM accounts a
     JOIN users u ON u.id = a.user_id
     WHERE a.provider = $1 AND a.provider_account_id = $2
     LIMIT 1`,
    [provider, providerAccountId]
  );
  if (!res.rows[0]) return null;
  return {
    user_id: String(res.rows[0].user_id),
    username: res.rows[0].username,
    role: res.rows[0].role,
    email: res.rows[0].email,
    is_verified: !!res.rows[0].is_verified
  };
}

async function getAccountForUser(userId, provider) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `SELECT provider_account_id FROM accounts
     WHERE user_id = $1 AND provider = $2
     LIMIT 1`,
    [userId, provider]
  );
  return res.rows[0] ? String(res.rows[0].provider_account_id) : null;
}

async function linkAccount(data) {
  await init();
  const client = await getPool();
  await client.query(
    `INSERT INTO accounts (user_id, provider, provider_account_id, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_account_id) DO UPDATE SET email = EXCLUDED.email`,
    [data.userId, data.provider, data.providerAccountId, data.email || null]
  );
  return true;
}

async function pingPostgres() {
  try { await init(); const client = await getPool(); await client.query("SELECT 1"); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
}

async function closePool() { if (pool) await pool.end(); }

async function getGuildStats() {
    await init();
    const client = await getPool();
    const res = await client.query('SELECT COUNT(*) as total FROM armory."Character"');
    return {
        total_members: parseInt(res.rows[0].total)
    };
}

/* =========================================
   MULTI-GUILD CRUD
   ========================================= */

async function getGuildByDiscordId(guildId) {
  await init();
  const client = await getPool();
  const res = await client.query('SELECT * FROM guilds WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

async function createGuild(data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO guilds (guild_id, guild_name, guild_icon, admin_role_id, admin_channel_id, stream_channel_id, twitch_tag)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (guild_id) DO UPDATE SET
       guild_name = $2, guild_icon = $3, updated_at = NOW()
     RETURNING *`,
    [data.guild_id, data.guild_name, data.guild_icon || null, data.admin_role_id || null, data.admin_channel_id || null, data.stream_channel_id || null, data.twitch_tag || 'brazug']
  );
  return res.rows[0];
}

async function updateGuildConfig(guildId, data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `UPDATE guilds SET admin_role_id = $2, admin_channel_id = $3, stream_channel_id = $4, twitch_tag = $5, settings = $6, updated_at = NOW()
     WHERE guild_id = $1 RETURNING *`,
    [guildId, data.admin_role_id || null, data.admin_channel_id || null, data.stream_channel_id || null, data.twitch_tag || 'brazug', JSON.stringify(data.settings || {})]
  );
  return res.rows[0];
}

async function createEvent(data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO events (guild_id, title, description, event_date, event_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.guild_id, data.title, data.description || null, data.event_date, data.event_type || 'raid', data.created_by]
  );
  return res.rows[0];
}

async function listEvents(guildId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    'SELECT * FROM events WHERE guild_id = $1 ORDER BY event_date ASC',
    [guildId]
  );
  return res.rows;
}

async function updateEvent(id, data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `UPDATE events SET title = $2, description = $3, event_date = $4, event_type = $5
     WHERE id = $1::uuid RETURNING *`,
    [id, data.title, data.description || null, data.event_date, data.event_type || 'raid']
  );
  return res.rows[0];
}

async function deleteEvent(id) {
  await init();
  const client = await getPool();
  const res = await client.query('DELETE FROM events WHERE id = $1::uuid', [id]);
  return res.rowCount > 0;
}

async function createGuildSale(data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO guild_sales (guild_id, item_name, price, seller_id, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.guild_id, data.item_name, data.price, data.seller_id, data.expires_at || null]
  );
  return res.rows[0];
}

async function listGuildSales(guildId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    'SELECT * FROM guild_sales WHERE guild_id = $1 AND status = $2 ORDER BY created_at DESC',
    [guildId, 'active']
  );
  return res.rows;
}

async function deleteGuildSale(id) {
  await init();
  const client = await getPool();
  const res = await client.query('DELETE FROM guild_sales WHERE id = $1::uuid', [id]);
  return res.rowCount > 0;
}

async function createAnnouncement(data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO announcements (guild_id, content, author_id, channel_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.guild_id, data.content, data.author_id, data.channel_id || null]
  );
  return res.rows[0];
}

async function listAnnouncements(guildId, limit = 10) {
  await init();
  const client = await getPool();
  const res = await client.query(
    'SELECT * FROM announcements WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
    [guildId, limit]
  );
  return res.rows;
}

async function deleteAnnouncement(id) {
  await init();
  const client = await getPool();
  const res = await client.query('DELETE FROM announcements WHERE id = $1::uuid', [id]);
  return res.rowCount > 0;
}

async function grantPermission(data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO guild_permissions (guild_id, user_id, permission, granted_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guild_id, user_id, permission) DO NOTHING
     RETURNING *`,
    [data.guild_id, data.user_id, data.permission, data.granted_by || null]
  );
  return res.rows[0];
}

async function revokePermission(guildId, userId, permission) {
  await init();
  const client = await getPool();
  const res = await client.query(
    'DELETE FROM guild_permissions WHERE guild_id = $1 AND user_id = $2 AND permission = $3',
    [guildId, userId, permission]
  );
  return res.rowCount > 0;
}

async function listPermissions(guildId) {
  await init();
  const client = await getPool();
  const res = await client.query(
    'SELECT * FROM guild_permissions WHERE guild_id = $1',
    [guildId]
  );
  return res.rows;
}

async function logGuildAudit(data) {
  await init();
  const client = await getPool();
  const res = await client.query(
    `INSERT INTO guild_audit_log (guild_id, admin_id, admin_username, action, target_type, target_id, payload, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [data.guild_id, data.admin_id, data.admin_username || null, data.action, data.target_type || null, data.target_id || null, JSON.stringify(data.payload || {}), data.ip_address || null, data.user_agent || null]
  );
  return res.rows[0];
}

async function listGuildAuditLogs(guildId, limit = 50) {
  await init();
  const client = await getPool();
  const res = await client.query(
    'SELECT * FROM guild_audit_log WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
    [guildId, limit]
  );
  return res.rows;
}

const SHEET_FIELDS = ["appearance", "background", "personality", "ideals", "bonds", "flaws"];

async function saveCharacterSheet(id, sheet) {
  await init();
  const client = await getPool();
  const clean = {};
  for (const k of SHEET_FIELDS) {
    clean[k] = String((sheet && sheet[k]) || "").slice(0, 2000);
  }
  await client.query("UPDATE wow_characters SET sheet = $2::jsonb WHERE id = $1::uuid", [id, JSON.stringify(clean)]);
  return clean;
}

module.exports = {
  init, getPool, pingPostgres, closePool,
  listAdventures, getAdventure, createAdventure, approveAdventure, updateAdventure, deleteAdventure,
  getUserByUsername, getUserByEmail, getUserById, createUser, listUsers, updateUser, updateUserPassword, deleteUser, verifyUser,
  setResetToken, getUserByResetToken, resetPassword,
  listCharacters, getCharacterByName, getCharacterById, createCharacter, updateCharacter, deleteCharacter, markCharacterAsDead,
  getFullArmoryCharacter, searchArmoryItems, getArmoryItem, listSales, createSale, listSalesByCharacter, deleteSale, acceptSale, purchaseSale,
  createBid, listBids, searchGroupedItems,
  listSalesHistory, createFeedback, getCharacterReputation, listFeedbacksForCharacter,
  getSetting, setSetting, setSpotifyRefreshToken, getSpotifyRefreshToken,
  listSuccesses, createSuccess, updateSuccess, deleteSuccess,
  createCoreApplication, listCoreApplications, getCoreApplication, updateCoreApplicationStatus, deleteCoreApplication,
  createSession, getUserBySessionToken, deleteSession, createAuthToken, consumeAuthToken, getAccount, getAccountForUser, linkAccount,
  getGuildStats,
  getGuildByDiscordId, createGuild, updateGuildConfig,
  createEvent, listEvents, updateEvent, deleteEvent,
  createGuildSale, listGuildSales, deleteGuildSale,
  createAnnouncement, listAnnouncements, deleteAnnouncement,
  grantPermission, revokePermission, listPermissions,
  logGuildAudit, listGuildAuditLogs,
  saveCharacterSheet
};
