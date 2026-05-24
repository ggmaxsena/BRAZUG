"use strict";

const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

/* =========================================
   CONFIG
========================================= */

const DATA_DIR = path.join(__dirname, "..", "data");
const JSON_DB_PATH = path.join(DATA_DIR, "adventures.json");

const MONGO_URI = process.env.MONGODB_URI
  ? String(process.env.MONGODB_URI).trim()
  : "";

const MONGO_DB_NAME =
  process.env.MONGODB_DB ||
  process.env.MONGODB_NAME ||
  "brazug";

const COLLECTION_NAME = "adventures";

/* =========================================
   MONGO CACHE
========================================= */

let mongoClient = null;
let mongoCollection = null;
let mongoFailed = false;

/* =========================================
   JSON FALLBACK
========================================= */

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, "[]", "utf8");
  }
}

function readDb() {
  ensureDbFile();

  try {
    const text = fs.readFileSync(JSON_DB_PATH, "utf8");

    return JSON.parse(text || "[]");
  } catch (err) {
    console.error("[BRAZUG] Failed reading JSON DB:", err);

    return [];
  }
}

function writeDb(records) {
  ensureDbFile();

  fs.writeFileSync(
    JSON_DB_PATH,
    JSON.stringify(records, null, 2),
    "utf8"
  );
}

/* =========================================
   HELPERS
========================================= */

function normalizeInput(data = {}) {
  return {
    title: String(data.title || "").trim(),

    body: String(data.body || "").trim(),

    author: String(data.author || "").trim(),

    image_url: String(data.image_url || "").trim(),

    event_date: data.event_date
      ? String(data.event_date)
      : new Date().toISOString().slice(0, 10),

    published:
      typeof data.published === "boolean"
        ? data.published
        : true,
  };
}

function sortAdventures(items) {
  return [...items].sort((a, b) => {
    const eventCompare = String(b.event_date || "").localeCompare(
      String(a.event_date || "")
    );

    if (eventCompare !== 0) {
      return eventCompare;
    }

    return String(b.created_at || "").localeCompare(
      String(a.created_at || "")
    );
  });
}

function isObjectId(id) {
  return typeof id === "string" && ObjectId.isValid(id);
}

function matchId(a, b) {
  return String(a) === String(b);
}

/* =========================================
   MONGO
========================================= */

async function getMongoCollection() {
  if (!MONGO_URI || mongoFailed) {
    return null;
  }

  if (mongoCollection) {
    return mongoCollection;
  }

  try {
    mongoClient = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await mongoClient.connect();

    const db = mongoClient.db(MONGO_DB_NAME);

    mongoCollection = db.collection(COLLECTION_NAME);

    await mongoCollection.createIndexes([
      { key: { event_date: -1 } },
      { key: { created_at: -1 } },
      { key: { published: 1 } },
    ]);

    console.log("[BRAZUG] MongoDB connected");

    return mongoCollection;
  } catch (err) {
    console.error(
      "[BRAZUG] MongoDB failed, using JSON fallback:",
      err.message
    );

    mongoFailed = true;

    return null;
  }
}

/* =========================================
   MAPPER
========================================= */

function mapMongoDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id ? doc._id.toString() : String(doc.id || ""),

    title: doc.title || "",

    body: doc.body || "",

    author: doc.author || "",

    image_url: doc.image_url || "",

    event_date:
      doc.event_date ||
      new Date().toISOString().slice(0, 10),

    published:
      typeof doc.published === "boolean"
        ? doc.published
        : true,

    created_at:
      doc.created_at ||
      new Date().toISOString(),

    updated_at:
      doc.updated_at ||
      new Date().toISOString(),
  };
}

/* =========================================
   LIST
========================================= */

async function listAdventures(publishedOnly = true) {
  const collection = await getMongoCollection();

  if (collection) {
    const filter = publishedOnly
      ? { published: true }
      : {};

    const docs = await collection
      .find(filter)
      .sort({
        event_date: -1,
        created_at: -1,
      })
      .toArray();

    return docs.map(mapMongoDoc);
  }

  const rows = readDb();

  const filtered = publishedOnly
    ? rows.filter((x) => x.published)
    : rows;

  return sortAdventures(filtered);
}

/* =========================================
   GET
========================================= */

async function getAdventure(id) {
  const collection = await getMongoCollection();

  if (collection) {
    const query = isObjectId(id)
      ? { _id: new ObjectId(id) }
      : { id: id };

    const doc = await collection.findOne(query);

    return mapMongoDoc(doc);
  }

  const rows = readDb();

  return rows.find((x) => matchId(x.id, id)) || null;
}

/* =========================================
   CREATE
========================================= */

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

    return mapMongoDoc({
      _id: result.insertedId,
      ...record,
    });
  }

  const rows = readDb();

  const nextId =
    rows.reduce((max, item) => {
      return Math.max(
        max,
        Number(item.id) || 0
      );
    }, 0) + 1;

  const jsonRecord = {
    id: nextId,
    ...record,
  };

  rows.unshift(jsonRecord);

  writeDb(rows);

  return jsonRecord;
}

/* =========================================
   UPDATE
========================================= */

async function updateAdventure(id, data) {
  const payload = normalizeInput(data);

  const updatedAt = new Date().toISOString();

  const collection = await getMongoCollection();

  if (collection) {
    const query = isObjectId(id)
      ? { _id: new ObjectId(id) }
      : { id: id };

    const result = await collection.findOneAndUpdate(
      query,
      {
        $set: {
          ...payload,
          updated_at: updatedAt,
        },
      },
      {
        returnDocument: "after",
      }
    );

    return mapMongoDoc(result.value);
  }

  const rows = readDb();

  const index = rows.findIndex((x) =>
    matchId(x.id, id)
  );

  if (index === -1) {
    return null;
  }

  const updated = {
    ...rows[index],
    ...payload,
    updated_at: updatedAt,
  };

  rows[index] = updated;

  writeDb(rows);

  return updated;
}

/* =========================================
   DELETE
========================================= */

async function deleteAdventure(id) {
  const collection = await getMongoCollection();

  if (collection) {
    const query = isObjectId(id)
      ? { _id: new ObjectId(id) }
      : { id: id };

    const result = await collection.deleteOne(query);

    return result.deletedCount > 0;
  }

  const rows = readDb();

  const filtered = rows.filter(
    (x) => !matchId(x.id, id)
  );

  if (filtered.length === rows.length) {
    return false;
  }

  writeDb(filtered);

  return true;
}

/* =========================================
   CLOSE
========================================= */

async function closeMongo() {
  try {
    if (mongoClient) {
      await mongoClient.close();
    }
  } catch (err) {
    console.error(
      "[BRAZUG] Mongo close error:",
      err.message
    );
  }
}

/* =========================================
   EXPORTS
========================================= */

module.exports = {
  listAdventures,
  getAdventure,
  createAdventure,
  updateAdventure,
  deleteAdventure,
  closeMongo,
};