"use strict";

const db = require("./db.cjs");

/* =========================================
   QUERY HELPERS
========================================= */

async function safeRows(sql, params = []) {
  try {
    const pool = await db.getPool();
    const res = await pool.query(sql, params);
    return res.rows;
  } catch (err) {
    console.error("[ANALYTICS]", err.message);
    return [];
  }
}

async function safeObject(sql, fallback = {}) {
  const rows = await safeRows(sql);
  return rows[0] || fallback;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const CLASS_ALIASES = {
  "caçador": "Hunter",
  "cacador": "Hunter",
  "hunter": "Hunter",
  "guerreiro": "Warrior",
  "warrior": "Warrior",
  "druida": "Druid",
  "druid": "Druid",
  "mago": "Mage",
  "mage": "Mage",
  "bruxo": "Warlock",
  "warlock": "Warlock",
  "sacerdote": "Priest",
  "priest": "Priest",
  "ladino": "Rogue",
  "rogue": "Rogue",
  "xamã": "Shaman",
  "xama": "Shaman",
  "shaman": "Shaman",
  "paladino": "Paladin",
  "paladin": "Paladin",
  "cavaleiro da morte": "Death Knight",
  "death knight": "Death Knight",
  "monje": "Monk",
  "monge": "Monk",
  "monk": "Monk",
  "caçador de demônios": "Demon Hunter",
  "demon hunter": "Demon Hunter"
};

const RACE_ALIASES = {
  "morto-vivo": "Undead",
  "morto vivo": "Undead",
  "undead": "Undead",
  "orc": "Orc",
  "tauren": "Tauren",
  "troll": "Troll",
  "elfo sangrento": "Blood Elf",
  "blood elf": "Blood Elf",
  "goblin": "Goblin",
  "humano": "Human",
  "human": "Human",
  "anão": "Dwarf",
  "anao": "Dwarf",
  "dwarf": "Dwarf",
  "gnomo": "Gnome",
  "gnome": "Gnome",
  "elfo noturno": "Night Elf",
  "night elf": "Night Elf",
  "draenei": "Draenei",
  "worgen": "Worgen",
  "pandaren": "Pandaren"
};

function normalizeClass(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "Não informado";
  return CLASS_ALIASES[key] || String(value).trim();
}

function normalizeRace(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "Não informado";
  return RACE_ALIASES[key] || String(value).trim();
}

function mergeClassRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = normalizeClass(row.class_name);
    const count = num(row.count);
    const dead = num(row.dead);
    const avg = num(row.avg_level);
    const current = grouped.get(key) || { class_name: key, count: 0, dead: 0, levelSum: 0 };
    current.count += count;
    current.dead += dead;
    current.levelSum += avg * count;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((row) => ({
      class_name: row.class_name,
      count: row.count,
      dead: row.dead,
      avg_level: row.count ? Math.round((row.levelSum / row.count) * 10) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count || a.class_name.localeCompare(b.class_name));
}

function mergeRaceRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = normalizeRace(row.race);
    const current = grouped.get(key) || { race: key, count: 0 };
    current.count += num(row.count);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.race.localeCompare(b.race));
}

/* =========================================
   OVERVIEW
========================================= */

async function getOverview() {
  const [users, characters, adventures, cores] = await Promise.all([
    safeObject(`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE COALESCE(is_verified, FALSE))::int AS verified_users,
        COUNT(*) FILTER (WHERE NOT COALESCE(is_verified, FALSE))::int AS pending_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_users_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d,
        COUNT(*) FILTER (WHERE role IN ('admin', 'guildmaster', 'officer'))::int AS staff_users
      FROM users
    `),
    safeObject(`
      SELECT
        COUNT(*)::int AS total_characters,
        COUNT(*) FILTER (WHERE COALESCE(is_dead, FALSE))::int AS dead_characters,
        COUNT(*) FILTER (WHERE NOT COALESCE(is_dead, FALSE))::int AS alive_characters,
        COALESCE(ROUND(AVG(level)::numeric, 1), 0)::float AS avg_level,
        COALESCE(MAX(level), 0)::int AS max_level
      FROM wow_characters
    `),
    safeObject(`
      SELECT
        COUNT(*)::int AS total_adventures,
        COUNT(*) FILTER (WHERE COALESCE(is_approved, FALSE))::int AS approved_adventures,
        COUNT(*) FILTER (WHERE NOT COALESCE(is_approved, FALSE))::int AS pending_adventures,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS adventures_30d
      FROM adventures
    `),
    safeObject(`
      SELECT
        COUNT(*)::int AS total_core_applications,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_core_applications
      FROM core_applications
    `)
  ]);

  const totalUsers = num(users.total_users);
  const verifiedUsers = num(users.verified_users);

  return {
    totalUsers,
    verifiedUsers,
    pendingUsers: num(users.pending_users),
    newUsers7d: num(users.new_users_7d),
    newUsers30d: num(users.new_users_30d),
    staffUsers: num(users.staff_users),
    verificationRate: totalUsers ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
    totalCharacters: num(characters.total_characters),
    deadCharacters: num(characters.dead_characters),
    aliveCharacters: num(characters.alive_characters),
    avgLevel: num(characters.avg_level),
    maxLevel: num(characters.max_level),
    totalAdventures: num(adventures.total_adventures),
    approvedAdventures: num(adventures.approved_adventures),
    pendingAdventures: num(adventures.pending_adventures),
    adventures30d: num(adventures.adventures_30d),
    totalCoreApplications: num(cores.total_core_applications),
    pendingCoreApplications: num(cores.pending_core_applications)
  };
}

/* =========================================
   USERS
========================================= */

async function getUsersByMonth() {
  return safeRows(`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - INTERVAL '11 months',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS month
    )
    SELECT
      to_char(m.month, 'YYYY-MM') AS month,
      COUNT(u.id)::int AS count
    FROM months m
    LEFT JOIN users u ON date_trunc('month', u.created_at) = m.month
    GROUP BY m.month
    ORDER BY m.month
  `);
}

async function getUsersByRole() {
  return safeRows(`
    SELECT COALESCE(NULLIF(TRIM(role), ''), 'guildmember') AS role, COUNT(*)::int AS count
    FROM users
    GROUP BY 1
    ORDER BY count DESC, role ASC
  `);
}

async function getRecentUsers(limit = 8) {
  return safeRows(`
    SELECT id, username, email, role, COALESCE(is_verified, FALSE) AS is_verified, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1::int
  `, [limit]);
}

/* =========================================
   CHARACTERS
========================================= */

async function getCharactersByMonth() {
  return safeRows(`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - INTERVAL '11 months',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS month
    )
    SELECT
      to_char(m.month, 'YYYY-MM') AS month,
      COUNT(c.id)::int AS count
    FROM months m
    LEFT JOIN wow_characters c ON date_trunc('month', c.created_at) = m.month
    GROUP BY m.month
    ORDER BY m.month
  `);
}

async function getCharactersByClass() {
  const rows = await safeRows(`
    SELECT
      COALESCE(NULLIF(TRIM(class), ''), 'Não informado') AS class_name,
      COUNT(*)::int AS count,
      COALESCE(ROUND(AVG(level)::numeric, 1), 0)::float AS avg_level,
      COUNT(*) FILTER (WHERE COALESCE(is_dead, FALSE))::int AS dead
    FROM wow_characters
    GROUP BY 1
    ORDER BY count DESC, class_name ASC
  `);
  return mergeClassRows(rows);
}

async function getCharactersByRace() {
  const rows = await safeRows(`
    SELECT
      COALESCE(NULLIF(TRIM(race), ''), 'Não informado') AS race,
      COUNT(*)::int AS count
    FROM wow_characters
    GROUP BY 1
    ORDER BY count DESC, race ASC
  `);
  return mergeRaceRows(rows);
}

async function getCharactersByLevel() {
  return safeRows(`
    SELECT bracket, count
    FROM (
      SELECT
        CASE
          WHEN level IS NULL OR level <= 0 THEN 'Sem nível'
          WHEN level < 10 THEN '1-9'
          WHEN level < 20 THEN '10-19'
          WHEN level < 30 THEN '20-29'
          WHEN level < 40 THEN '30-39'
          WHEN level < 50 THEN '40-49'
          WHEN level < 60 THEN '50-59'
          ELSE '60+'
        END AS bracket,
        MIN(level) AS sort_level,
        COUNT(*)::int AS count
      FROM wow_characters
      GROUP BY 1
    ) t
    ORDER BY sort_level
  `);
}

async function getCharactersByRealm() {
  return safeRows(`
    SELECT COALESCE(NULLIF(TRIM(realm), ''), 'Não informado') AS realm, COUNT(*)::int AS count
    FROM wow_characters
    GROUP BY 1
    ORDER BY count DESC, realm ASC
  `);
}

async function getRecentCharacters(limit = 8) {
  return safeRows(`
    SELECT
      c.id, c.name, c.class, c.race, c.level, c.guild, c.realm,
      COALESCE(c.is_dead, FALSE) AS is_dead, c.created_at, u.username
    FROM wow_characters c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT $1::int
  `, [limit]);
}

async function getTopCharacters(limit = 8) {
  return safeRows(`
    SELECT
      c.id, c.name, c.class, c.race, c.level, c.guild, c.realm,
      COALESCE(c.is_dead, FALSE) AS is_dead, c.created_at, u.username
    FROM wow_characters c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.level DESC, c.created_at DESC
    LIMIT $1::int
  `, [limit]);
}

/* =========================================
   ADVENTURES / CORES
========================================= */

async function getAdventuresByMonth() {
  return safeRows(`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - INTERVAL '11 months',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS month
    )
    SELECT
      to_char(m.month, 'YYYY-MM') AS month,
      COUNT(a.id)::int AS count
    FROM months m
    LEFT JOIN adventures a ON date_trunc('month', a.created_at) = m.month
    GROUP BY m.month
    ORDER BY m.month
  `);
}

async function getAdventuresByStatus() {
  return safeRows(`
    SELECT status, COUNT(*)::int AS count
    FROM (
      SELECT CASE WHEN COALESCE(is_approved, FALSE) THEN 'approved' ELSE 'pending' END AS status
      FROM adventures
    ) t
    GROUP BY status
    ORDER BY count DESC
  `);
}

async function getRecentAdventures(limit = 5) {
  return safeRows(`
    SELECT id, title, author, COALESCE(is_approved, FALSE) AS is_approved, visibility, created_at
    FROM adventures
    ORDER BY created_at DESC
    LIMIT $1::int
  `, [limit]);
}

async function getCoresByStatus() {
  return safeRows(`
    SELECT COALESCE(NULLIF(TRIM(status), ''), 'pending') AS status, COUNT(*)::int AS count
    FROM core_applications
    GROUP BY 1
    ORDER BY count DESC, status ASC
  `);
}

async function getCoresByCore() {
  return safeRows(`
    SELECT COALESCE(NULLIF(TRIM(core_name), ''), 'Não informado') AS core_name, COUNT(*)::int AS count
    FROM core_applications
    GROUP BY 1
    ORDER BY count DESC, core_name ASC
  `);
}

/* =========================================
   DASHBOARD
========================================= */

async function getDashboard() {
  await db.init();

  const [
    overview,
    usersByMonth,
    usersByRole,
    recentUsers,
    charactersByMonth,
    charactersByClass,
    charactersByRace,
    charactersByLevel,
    charactersByRealm,
    recentCharacters,
    topCharacters,
    adventuresByMonth,
    adventuresByStatus,
    recentAdventures,
    coresByStatus,
    coresByCore
  ] = await Promise.all([
    getOverview(),
    getUsersByMonth(),
    getUsersByRole(),
    getRecentUsers(),
    getCharactersByMonth(),
    getCharactersByClass(),
    getCharactersByRace(),
    getCharactersByLevel(),
    getCharactersByRealm(),
    getRecentCharacters(),
    getTopCharacters(),
    getAdventuresByMonth(),
    getAdventuresByStatus(),
    getRecentAdventures(),
    getCoresByStatus(),
    getCoresByCore()
  ]);

  return {
    generatedAt: new Date().toISOString(),
    overview,
    users: { byMonth: usersByMonth, byRole: usersByRole, recent: recentUsers },
    characters: {
      byMonth: charactersByMonth,
      byClass: charactersByClass,
      byRace: charactersByRace,
      byLevel: charactersByLevel,
      byRealm: charactersByRealm,
      recent: recentCharacters,
      top: topCharacters
    },
    adventures: { byMonth: adventuresByMonth, byStatus: adventuresByStatus, recent: recentAdventures },
    cores: { byStatus: coresByStatus, byCore: coresByCore }
  };
}

/* =========================================
   LISTS / REPORTS
========================================= */

async function listPlayers() {
  await db.init();
  return safeRows(`
    SELECT
      u.id,
      u.username,
      u.email,
      COALESCE(u.role, 'guildmember') AS role,
      COALESCE(u.is_verified, FALSE) AS is_verified,
      u.created_at,
      COUNT(c.id)::int AS characters,
      COALESCE(MAX(c.level), 0)::int AS max_level,
      (COUNT(c.id) FILTER (WHERE COALESCE(c.is_dead, FALSE)))::int AS dead_characters
    FROM users u
    LEFT JOIN wow_characters c ON c.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
}

async function listCharacters(search = "", limit = 500) {
  await db.init();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const term = String(search || "").trim();
  const pattern = term ? `%${term}%` : "";
  const rows = await safeRows(`
    SELECT
      c.id, c.name, c.class, c.race, c.level, c.guild, c.realm,
      COALESCE(c.is_dead, FALSE) AS is_dead,
      c.death_cause, c.death_location, c.death_level,
      c.created_at, u.username
    FROM wow_characters c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE (
      $1::text = ''
      OR LOWER(c.name) LIKE LOWER($1::text)
      OR LOWER(c.class) LIKE LOWER($1::text)
      OR LOWER(c.race) LIKE LOWER($1::text)
      OR LOWER(COALESCE(u.username, '')) LIKE LOWER($1::text)
    )
    ORDER BY c.level DESC, c.created_at DESC
    LIMIT $2::int
  `, [pattern, safeLimit]);

  return rows.map((row) => ({
    ...row,
    class: normalizeClass(row.class),
    race: normalizeRace(row.race)
  }));
}

/* =========================================
   CSV
========================================= */

function csvValue(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map(c => csvValue(c.label)).join(";");
  const lines = rows.map(row => columns.map(c => {
    const raw = typeof c.value === "function" ? c.value(row) : row[c.key];
    return csvValue(raw);
  }).join(";"));
  return "\uFEFF" + [header, ...lines].join("\r\n");
}

async function getPlayersCsv() {
  const rows = await listPlayers();
  return toCsv(rows, [
    { label: "usuario", key: "username" },
    { label: "email", key: "email" },
    { label: "cargo", key: "role" },
    { label: "verificado", key: "is_verified", value: r => r.is_verified ? "sim" : "não" },
    { label: "personagens", key: "characters" },
    { label: "maior_nivel", key: "max_level" },
    { label: "personagens_mortos", key: "dead_characters" },
    { label: "cadastrado_em", key: "created_at", value: r => r.created_at ? new Date(r.created_at).toISOString() : "" }
  ]);
}

async function getCharactersCsv() {
  const rows = await listCharacters("", 2000);
  return toCsv(rows, [
    { label: "personagem", key: "name" },
    { label: "classe", key: "class" },
    { label: "raca", key: "race" },
    { label: "nivel", key: "level" },
    { label: "guilda", key: "guild" },
    { label: "reino", key: "realm" },
    { label: "status", key: "is_dead", value: r => r.is_dead ? "morto" : "vivo" },
    { label: "causa_da_morte", key: "death_cause" },
    { label: "local_da_morte", key: "death_location" },
    { label: "nivel_da_morte", key: "death_level" },
    { label: "dono", key: "username" },
    { label: "criado_em", key: "created_at", value: r => r.created_at ? new Date(r.created_at).toISOString() : "" }
  ]);
}

async function getClassesCsv() {
  const rows = await getCharactersByClass();
  return toCsv(rows, [
    { label: "classe", key: "class_name" },
    { label: "personagens", key: "count" },
    { label: "nivel_medio", key: "avg_level" },
    { label: "mortos", key: "dead" }
  ]);
}

async function getAdventuresCsv() {
  const rows = await safeRows(`
    SELECT
      a.title, a.author, a.visibility,
      COALESCE(a.is_approved, FALSE) AS is_approved,
      a.event_date, a.created_at, u.username
    FROM adventures a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
  `);
  return toCsv(rows, [
    { label: "titulo", key: "title" },
    { label: "autor", key: "author" },
    { label: "autor_conta", key: "username" },
    { label: "status", key: "is_approved", value: r => r.is_approved ? "aprovada" : "pendente" },
    { label: "visibilidade", key: "visibility" },
    { label: "data_evento", key: "event_date", value: r => r.event_date ? new Date(r.event_date).toISOString().slice(0, 10) : "" },
    { label: "criado_em", key: "created_at", value: r => r.created_at ? new Date(r.created_at).toISOString() : "" }
  ]);
}

async function getCoresCsv() {
  const rows = await safeRows(`
    SELECT
      ca.core_name, ca.core_id, ca.status, ca.answers, ca.created_at, u.username
    FROM core_applications ca
    LEFT JOIN users u ON u.id = ca.user_id
    ORDER BY ca.created_at DESC
  `);
  return toCsv(rows, [
    { label: "core", key: "core_name" },
    { label: "core_id", key: "core_id" },
    { label: "jogador", key: "username" },
    { label: "status", key: "status" },
    { label: "respostas", key: "answers", value: r => r.answers ? JSON.stringify(r.answers) : "" },
    { label: "criado_em", key: "created_at", value: r => r.created_at ? new Date(r.created_at).toISOString() : "" }
  ]);
}

module.exports = {
  getDashboard,
  getOverview,
  listPlayers,
  listCharacters,
  getPlayersCsv,
  getCharactersCsv,
  getClassesCsv,
  getAdventuresCsv,
  getCoresCsv
};
