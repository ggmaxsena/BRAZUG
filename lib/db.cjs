"use strict";

const fs = require("fs");
const path = require("path");

let db = null;
let initPromise = null;

function getDbPath() {
  const custom = process.env.DATABASE_PATH;
  if (custom) return path.resolve(custom);
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "brazug.db");
}

function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(getDbPath(), Buffer.from(data));
}

function rowToAdventure(columns, row) {
  const o = {};
  columns.forEach(function (col, i) {
    o[col] = row[i];
  });
  o.published = !!o.published;
  return o;
}

async function initDb() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async function () {
    const initSqlJs = require("sql.js");
    const SQL = await initSqlJs();
    const dbPath = getDbPath();

    if (fs.existsSync(dbPath)) {
      db = new SQL.Database(fs.readFileSync(dbPath));
    } else {
      db = new SQL.Database();
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS adventures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        event_date TEXT NOT NULL DEFAULT '',
        published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    persist();
    console.log("[BRAZUG] database ready:", dbPath);
    return db;
  })();

  return initPromise;
}

function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function listAdventures(publishedOnly) {
  await initDb();
  let sql =
    "SELECT id, title, body, author, image_url, event_date, published, created_at, updated_at FROM adventures";
  if (publishedOnly) sql += " WHERE published = 1";
  sql += " ORDER BY event_date DESC, id DESC";
  return queryAll(sql).map(function (r) {
    r.published = !!r.published;
    return r;
  });
}

async function getAdventure(id) {
  await initDb();
  const rows = queryAll(
    "SELECT id, title, body, author, image_url, event_date, published, created_at, updated_at FROM adventures WHERE id = ?",
    [id]
  );
  if (!rows.length) return null;
  rows[0].published = !!rows[0].published;
  return rows[0];
}

async function createAdventure(data) {
  await initDb();
  db.run(
    `INSERT INTO adventures (title, body, author, image_url, event_date, published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.body || "",
      data.author || "",
      data.image_url || "",
      data.event_date || new Date().toISOString().slice(0, 10),
      data.published === false ? 0 : 1,
    ]
  );
  persist();
  const r = db.exec("SELECT last_insert_rowid() AS id");
  const newId = r[0].values[0][0];
  return getAdventure(newId);
}

async function updateAdventure(id, data) {
  const existing = await getAdventure(id);
  if (!existing) return null;

  await initDb();
  db.run(
    `UPDATE adventures SET
      title = ?, body = ?, author = ?, image_url = ?, event_date = ?,
      published = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.title !== undefined ? data.title : existing.title,
      data.body !== undefined ? data.body : existing.body,
      data.author !== undefined ? data.author : existing.author,
      data.image_url !== undefined ? data.image_url : existing.image_url,
      data.event_date !== undefined ? data.event_date : existing.event_date,
      data.published !== undefined ? (data.published ? 1 : 0) : existing.published ? 1 : 0,
      id,
    ]
  );
  persist();
  return getAdventure(id);
}

async function deleteAdventure(id) {
  await initDb();
  db.run("DELETE FROM adventures WHERE id = ?", [id]);
  persist();
  return true;
}

module.exports = {
  initDb,
  listAdventures,
  getAdventure,
  createAdventure,
  updateAdventure,
  deleteAdventure,
};
