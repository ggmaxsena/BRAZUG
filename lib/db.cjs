"use strict";

const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "adventures.json");

function ensureDbFile() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "[]", "utf8");
  }
}

function readDb() {
  ensureDbFile();
  try {
    const text = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(text || "[]");
  } catch (err) {
    console.error("Failed to read adventures database:", err);
    return [];
  }
}

function writeDb(records) {
  fs.writeFileSync(dbPath, JSON.stringify(records, null, 2), "utf8");
}

function normalizeInput(data) {
  return {
    title: String(data.title || "").trim(),
    body: String(data.body || "").trim(),
    author: String(data.author || "").trim(),
    image_url: String(data.image_url || "").trim(),
    event_date: data.event_date ? String(data.event_date) : new Date().toISOString().slice(0, 10),
    published: data.published !== false,
  };
}

function sortAdventures(items) {
  return items.sort((a, b) => {
    if (a.event_date !== b.event_date) {
      return b.event_date.localeCompare(a.event_date);
    }
    return b.id - a.id;
  });
}

async function listAdventures(publishedOnly) {
  const rows = readDb();
  const filtered = publishedOnly ? rows.filter((item) => item.published) : rows;
  return sortAdventures(filtered);
}

async function getAdventure(id) {
  const rows = readDb();
  return rows.find((item) => item.id === Number(id)) || null;
}

async function createAdventure(data) {
  const rows = readDb();
  const nextId = rows.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const payload = normalizeInput(data);
  const now = new Date().toISOString();
  const record = {
    id: nextId,
    ...payload,
    created_at: now,
    updated_at: now,
  };
  rows.push(record);
  writeDb(rows);
  return record;
}

async function updateAdventure(id, data) {
  const rows = readDb();
  const index = rows.findIndex((item) => item.id === Number(id));
  if (index === -1) return null;

  const existing = rows[index];
  const payload = normalizeInput(data);
  const updated = {
    ...existing,
    ...payload,
    updated_at: new Date().toISOString(),
  };
  rows[index] = updated;
  writeDb(rows);
  return updated;
}

async function deleteAdventure(id) {
  const rows = readDb();
  const filtered = rows.filter((item) => item.id !== Number(id));
  if (filtered.length === rows.length) return false;
  writeDb(filtered);
  return true;
}

module.exports = {
  listAdventures,
  getAdventure,
  createAdventure,
  updateAdventure,
  deleteAdventure,
};
