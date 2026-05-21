"use strict";

const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const jsonDbPath = path.join(__dirname, "..", "data", "adventures.json");
const mongoUri = process.env.MONGODB_URI ? String(process.env.MONGODB_URI).trim() : "";
const mongoDbName = process.env.MONGODB_DB || process.env.MONGODB_NAME || "brazug";
const mongoCollectionName = "adventures";

let mongoClient;
let mongoCollection;

function ensureDbFile() {
  if (!fs.existsSync(jsonDbPath)) {
    fs.writeFileSync(jsonDbPath, "[]", "utf8");
  }
}

function readDb() {
  ensureDbFile();
  try {
    const text = fs.readFileSync(jsonDbPath, "utf8");
    return JSON.parse(text || "[]");
  } catch (err) {
    console.error("Failed to read adventures database:", err);
    return [];
  }
}

function writeDb(records) {
  fs.writeFileSync(jsonDbPath, JSON.stringify(records, null, 2), "utf8");
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
    if (a.created_at && b.created_at) {
      return b.created_at.localeCompare(a.created_at);
    }
    return 0;
  });
}

function mapMongoDoc(doc) {
  if (!doc) return null;
  const mapped = {
    id: doc._id.toString(),
    title: doc.title || "",
    body: doc.body || "",
    author: doc.author || "",
    image_url: doc.image_url || "",
    event_date: doc.event_date || new Date().toISOString().slice(0, 10),
    published: typeof doc.published === "boolean" ? doc.published : true,
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: doc.updated_at || new Date().toISOString(),
  };
  return mapped;
}

async function getMongoCollection() {
  if (!mongoUri) return null;
  if (mongoCollection) return mongoCollection;

  mongoClient = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await mongoClient.connect();
  mongoCollection = mongoClient.db(mongoDbName).collection(mongoCollectionName);
  await mongoCollection.createIndexes([
    { key: { event_date: -1 } },
    { key: { published: 1 } },
  ]);

  return mongoCollection;
}

function isObjectId(value) {
  return typeof value === "string" && ObjectId.isValid(value);
}

async function listAdventures(publishedOnly) {
  const collection = await getMongoCollection();
  if (collection) {
    const filter = publishedOnly ? { published: true } : {};
    const docs = await collection
      .find(filter)
      .sort({ event_date: -1, created_at: -1 })
      .toArray();
    return docs.map(mapMongoDoc);
  }

  const rows = readDb();
  const filtered = publishedOnly ? rows.filter((item) => item.published) : rows;
  return sortAdventures(filtered);
}

async function getAdventure(id) {
  const collection = await getMongoCollection();
  if (collection) {
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const doc = await collection.findOne(query);
    return mapMongoDoc(doc);
  }

  const rows = readDb();
  return rows.find((item) => item.id === id) || null;
}

async function createAdventure(data) {
  const payload = normalizeInput(data);
  const now = new Date().toISOString();
  const record = {
    ...payload,
    created_at: now,
    updated_at: now,
  };

  const collection = await getMongoCollection();
  if (collection) {
    const result = await collection.insertOne(record);
    return mapMongoDoc({ _id: result.insertedId, ...record });
  }

  const rows = readDb();
  const nextId = rows.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const jsonRecord = {
    id: nextId,
    ...record,
  };
  rows.push(jsonRecord);
  writeDb(rows);
  return jsonRecord;
}

async function updateAdventure(id, data) {
  const payload = normalizeInput(data);
  const updatedAt = new Date().toISOString();

  const collection = await getMongoCollection();
  if (collection) {
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const result = await collection.findOneAndUpdate(
      query,
      { $set: { ...payload, updated_at: updatedAt } },
      { returnDocument: "after" }
    );
    return mapMongoDoc(result.value);
  }

  const rows = readDb();
  const index = rows.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const existing = rows[index];
  const updated = {
    ...existing,
    ...payload,
    updated_at: updatedAt,
  };
  rows[index] = updated;
  writeDb(rows);
  return updated;
}

async function deleteAdventure(id) {
  const collection = await getMongoCollection();
  if (collection) {
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const result = await collection.deleteOne(query);
    return result.deletedCount > 0;
  }

  const rows = readDb();
  const filtered = rows.filter((item) => item.id !== id);
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
