"use strict";

const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

/* =========================================
   CONFIG
========================================= */

const DATA_DIR = path.join(__dirname, "..", "data");

const JSON_DB_PATH = path.join(
  DATA_DIR,
  "adventures.json"
);

const JSON_USERS_PATH = path.join(
  DATA_DIR,
  "users.json"
);

const MONGO_URI = process.env.MONGODB_URI
  ? String(process.env.MONGODB_URI).trim()
  : "";

const MONGO_DB_NAME =
  process.env.MONGODB_DB ||
  process.env.MONGODB_NAME ||
  "Brazug";

const COLLECTION_NAME = "adventures";
const USERS_COLLECTION = "users";

/* =========================================
   MONGO CACHE
========================================= */

let mongoClient = null;
let mongoCollection = null;
let mongoUsersCollection = null;
let mongoFailed = false;

/* =========================================
   JSON FALLBACK
========================================= */

function ensureDbFile(filePath) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      "[]",
      "utf8"
    );
  }
}

function readJsonFile(filePath) {
  ensureDbFile(filePath);

  try {
    const text = fs.readFileSync(
      filePath,
      "utf8"
    );

    return JSON.parse(text || "[]");
  } catch (err) {
    console.error(
      `[BRAZUG] Failed reading JSON DB (${filePath}):`,
      err
    );

    return [];
  }
}

function writeJsonFile(filePath, records) {
  ensureDbFile(filePath);

  fs.writeFileSync(
    filePath,
    JSON.stringify(records, null, 2),
    "utf8"
  );
}

function readDb() {
  return readJsonFile(JSON_DB_PATH);
}

function writeDb(records) {
  writeJsonFile(JSON_DB_PATH, records);
}

function readUsersDb() {
  return readJsonFile(JSON_USERS_PATH);
}

function writeUsersDb(records) {
  writeJsonFile(JSON_USERS_PATH, records);
}

/* =========================================
   HELPERS
========================================= */

function normalizeVisibility(value) {
  const visibility = String(
    value || "public"
  )
    .trim()
    .toLowerCase();

  if (
    visibility === "shadow" ||
    visibility === "secret"
  ) {
    return "shadow";
  }

  return "public";
}

function normalizeInput(data) {
  return {
    title: String(data.title || "").trim(),

    body: String(data.body || "").trim(),

    author: String(data.author || "").trim(),

    image_url: String(
      data.image_url || ""
    ).trim(),

    event_date: data.event_date
      ? String(data.event_date)
      : new Date()
          .toISOString()
          .slice(0, 10),

    published: data.published !== false,

    visibility: normalizeVisibility(
      data.visibility
    ),
  };
}

function normalizeUser(data) {
  return {
    username: String(data.username || "").trim().toLowerCase(),
    password: String(data.password || ""),
    role: String(data.role || "guildmember").toLowerCase(),
    created_at: data.created_at || new Date().toISOString(),
  };
}

function sortAdventures(items) {
  return [...items].sort((a, b) => {
    const eventCompare = String(
      b.event_date || ""
    ).localeCompare(
      String(a.event_date || "")
    );

    if (eventCompare !== 0) {
      return eventCompare;
    }

    return String(
      b.created_at || ""
    ).localeCompare(
      String(a.created_at || "")
    );
  });
}

function isObjectId(id) {
  return (
    typeof id === "string" &&
    ObjectId.isValid(id)
  );
}

function matchId(a, b) {
  return String(a) === String(b);
}

/* =========================================
   MONGO
========================================= */

async function initMongoClient() {
  if (!MONGO_URI || mongoFailed) {
    return null;
  }

  if (mongoClient) {
    return mongoClient;
  }

  try {
    mongoClient = new MongoClient(
      MONGO_URI,
      {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      }
    );

    await mongoClient.connect();
    return mongoClient;
  } catch (err) {
    console.error(
      "[BRAZUG] MongoDB failed, using JSON fallback:",
      err.message
    );
    mongoFailed = true;
    return null;
  }
}

async function getMongoCollection() {
  const client = await initMongoClient();
  if (!client) return null;
  if (mongoCollection) return mongoCollection;

  const db = client.db(MONGO_DB_NAME);
  mongoCollection = db.collection(COLLECTION_NAME);

  await mongoCollection.createIndexes([
    { key: { event_date: -1 } },
    { key: { created_at: -1 } },
    { key: { published: 1 } },
    { key: { visibility: 1 } },
  ]);

  return mongoCollection;
}

async function getMongoUsersCollection() {
  const client = await initMongoClient();
  if (!client) return null;
  if (mongoUsersCollection) return mongoUsersCollection;

  const db = client.db(MONGO_DB_NAME);
  mongoUsersCollection = db.collection(USERS_COLLECTION);

  await mongoUsersCollection.createIndex({ username: 1 }, { unique: true });

  return mongoUsersCollection;
}

/* =========================================
   MAPPER
========================================= */

function mapMongoDoc(doc) {
  if (!doc) {
    return null;
  }

  const mapped = {
    id: doc._id ? doc._id.toString() : String(doc.id || ""),
    ...doc
  };
  delete mapped._id;
  return mapped;
}

/* =========================================
   LIST
========================================= */

/*
  publishedOnly:
    true  -> apenas publicados
    false -> todos

  visibility:
    "public"
    "shadow"
    null -> todas
*/

async function listAdventures(
  publishedOnly = true,
  visibility = "public"
) {
  const collection =
    await getMongoCollection();

  /* ======================
     MONGO
  ====================== */

  if (collection) {
    const filter = {};

    if (publishedOnly) {
      filter.published = true;
    }

    if (
      visibility !== null &&
      visibility !== undefined
    ) {
      filter.visibility =
        normalizeVisibility(
          visibility
        );
    }

    const docs = await collection
      .find(filter)
      .sort({
        event_date: -1,
        created_at: -1,
      })
      .toArray();

    return docs.map(mapMongoDoc);
  }

  /* ======================
     JSON
  ====================== */

  const rows = readDb();

  let filtered = rows;

  if (publishedOnly) {
    filtered = filtered.filter(
      (x) => x.published
    );
  }

  if (
    visibility !== null &&
    visibility !== undefined
  ) {
    filtered = filtered.filter(
      (x) =>
        normalizeVisibility(
          x.visibility
        ) ===
        normalizeVisibility(
          visibility
        )
    );
  }

  return sortAdventures(filtered);
}

/* =========================================
   GET
========================================= */

async function getAdventure(id) {
  const collection =
    await getMongoCollection();

  if (collection) {
    const query = isObjectId(id)
      ? {
          _id: new ObjectId(id),
        }
      : {
          id: id,
        };

    const doc =
      await collection.findOne(query);

    return mapMongoDoc(doc);
  }

  const rows = readDb();

  return (
    rows.find((x) =>
      matchId(x.id, id)
    ) || null
  );
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

  const collection =
    await getMongoCollection();

  if (collection) {
    const result =
      await collection.insertOne(
        record
      );

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

async function updateAdventure(
  id,
  data
) {
  const payload = normalizeInput(data);

  const updatedAt =
    new Date().toISOString();

  const collection =
    await getMongoCollection();

  if (collection) {
    const query = isObjectId(id)
      ? {
          _id: new ObjectId(id),
        }
      : {
          id: id,
        };

    const result =
      await collection.findOneAndUpdate(
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
  const collection =
    await getMongoCollection();

  if (collection) {
    const query = isObjectId(id)
      ? {
          _id: new ObjectId(id),
        }
      : {
          id: id,
        };

    const result =
      await collection.deleteOne(
        query
      );

    return result.deletedCount > 0;
  }

  const rows = readDb();

  const filtered = rows.filter(
    (x) => !matchId(x.id, id)
  );

  if (
    filtered.length === rows.length
  ) {
    return false;
  }

  writeDb(filtered);

  return true;
}

/* =========================================
   USERS CRUD
========================================= */

async function getUserByUsername(username) {
  const uname = String(username || "").toLowerCase();
  const collection = await getMongoUsersCollection();

  if (collection) {
    const doc = await collection.findOne({ username: uname });
    return mapMongoDoc(doc);
  }

  const users = readUsersDb();
  return users.find(u => u.username === uname) || null;
}

async function createUser(data) {
  const payload = normalizeUser(data);
  const collection = await getMongoUsersCollection();

  if (collection) {
    const result = await collection.insertOne(payload);
    return mapMongoDoc({ _id: result.insertedId, ...payload });
  }

  const users = readUsersDb();
  if (users.some(u => u.username === payload.username)) {
    throw new Error("Usuário já existe");
  }

  const nextId = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
  const record = { id: nextId, ...payload };
  users.push(record);
  writeUsersDb(users);
  return record;
}

async function listUsers() {
  const collection = await getMongoUsersCollection();

  if (collection) {
    const docs = await collection.find({}).toArray();
    return docs.map(mapMongoDoc);
  }

  return readUsersDb();
}

async function deleteUser(id) {
  const collection = await getMongoUsersCollection();

  if (collection) {
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: Number(id) || id };
    const result = await collection.deleteOne(query);
    return result.deletedCount > 0;
  }

  const users = readUsersDb();
  const filtered = users.filter(u => !matchId(u.id, id));
  if (filtered.length === users.length) return false;
  writeUsersDb(filtered);
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
  getUserByUsername,
  createUser,
  listUsers,
  deleteUser,
  closeMongo,
};