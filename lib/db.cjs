"use strict";

const dns = require("dns");
const { MongoClient, ObjectId } = require("mongodb");

/* =========================================
   CONFIG
========================================= */

// MONGODB_URI_STANDARD (mongodb://...) evita lookup SRV — útil na Hostinger.
const MONGO_URI = process.env.MONGODB_URI_STANDARD
  ? String(process.env.MONGODB_URI_STANDARD).trim()
  : process.env.MONGODB_URI
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

/* =========================================
   HELPERS
========================================= */

function mongoHostForLog() {
  if (!MONGO_URI) {
    return null;
  }

  const match = MONGO_URI.match(/@([^/?]+)/);
  return match ? match[1] : null;
}

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
    created_at: data.created_at || new Date().toISOString(),
  };
}

function isObjectId(id) {
  return typeof id === "string" && ObjectId.isValid(id);
}

function isMongoConnectionError(err) {
  const msg = String((err && err.message) || err || "").toLowerCase();
  return (
    msg.includes("topology is closed") ||
    msg.includes("client is closed") ||
    msg.includes("connection closed") ||
    msg.includes("connection pool")
  );
}

/* =========================================
   MONGO INIT
========================================= */

if (typeof global !== "undefined" && !global.crypto) {
  try {
    const cryptoModule = require("crypto");
    global.crypto = cryptoModule.webcrypto || cryptoModule;
  } catch (e) {
    console.error("[BRAZUG] Erro ao carregar polyfill de crypto:", e.message);
  }
}

function configureMongoDns() {
  if (process.env.MONGODB_DNS === "0") {
    return;
  }

  const raw =
    process.env.MONGODB_DNS_SERVERS || "8.8.8.8,1.1.1.1";
  const servers = raw
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);

  if (!servers.length) {
    return;
  }

  dns.setServers(servers);
  console.log(
    "[BRAZUG] DNS para MongoDB:",
    servers.join(", ")
  );
}

function mongoClientOptions() {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    // Evita handshake TLS quebrado em VPS/shared (ex.: Hostinger).
    autoSelectFamily: false,
    family: 4,
  };

  if (process.env.MONGODB_IPV4 === "0") {
    delete options.family;
    delete options.autoSelectFamily;
  }

  return options;
}

configureMongoDns();

async function resetMongoState() {
  mongoCollection = null;
  mongoUsersCollection = null;

  if (!mongoClient) {
    return;
  }

  const client = mongoClient;
  mongoClient = null;

  try {
    await client.close();
  } catch (err) {
    console.warn("[BRAZUG] MongoDB close:", err.message);
  }
}

async function initMongoClient() {
  if (!MONGO_URI) {
    throw new Error("MONGODB_URI não configurada no ambiente (.env)");
  }

  if (mongoClient) {
    try {
      await mongoClient.db(MONGO_DB_NAME).command({ ping: 1 });
      return mongoClient;
    } catch (err) {
      console.warn(
        "[BRAZUG] MongoDB desconectado, reconectando:",
        err.message
      );
      await resetMongoState();
    }
  }

  try {
    mongoClient = new MongoClient(
      MONGO_URI,
      mongoClientOptions()
    );

    const activeClient = mongoClient;
    activeClient.on("close", function () {
      if (mongoClient === activeClient) {
        mongoCollection = null;
        mongoUsersCollection = null;
        mongoClient = null;
      }
    });

    await mongoClient.connect();
    console.log("[BRAZUG] MongoDB conectado:", mongoHostForLog());
    return mongoClient;
  } catch (err) {
    mongoClient = null;
    console.error(
      "[BRAZUG] Falha ao conectar no MongoDB (" +
        mongoHostForLog() +
        "):",
      err.message
    );
    throw err;
  }
}

async function withMongoRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isMongoConnectionError(err)) {
      throw err;
    }

    console.warn(
      "[BRAZUG] Operação MongoDB falhou, tentando reconectar:",
      err.message
    );
    await resetMongoState();
    return await fn();
  }
}

async function getMongoCollection() {
  const client = await initMongoClient();
  if (mongoCollection) {
    return mongoCollection;
  }

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
  if (mongoUsersCollection) {
    return mongoUsersCollection;
  }

  const db = client.db(MONGO_DB_NAME);
  mongoUsersCollection = db.collection(USERS_COLLECTION);

  await mongoUsersCollection.createIndex({ username: 1 }, { unique: true });

  return mongoUsersCollection;
}

async function pingMongo() {
  if (!MONGO_URI) {
    return { ok: false, error: "MONGODB_URI não configurada" };
  }

  try {
    const client = await initMongoClient();
    await client.db(MONGO_DB_NAME).command({ ping: 1 });
    return { ok: true, host: mongoHostForLog() };
  } catch (err) {
    return { ok: false, host: mongoHostForLog(), error: err.message };
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
    image_data: doc.image_data || null,
    event_date: doc.event_date || "",
    published: doc.published !== false,
    visibility: doc.visibility || "public",
    created_at: doc.created_at || null,
    updated_at: doc.updated_at || null,
  };
}

/* =========================================
   CRUD AVENTURAS
========================================= */

async function listAdventures(publishedOnly = true, visibility = "public") {
  return withMongoRetry(async function () {
    const collection = await getMongoCollection();
    const filter = {};

    if (publishedOnly) {
      filter.published = true;
    }

    if (visibility !== null && visibility !== undefined) {
      filter.visibility = normalizeVisibility(visibility);
    }

    const docs = await collection
      .find(filter, { projection: { image_data: 0 } })
      .sort({ event_date: -1, created_at: -1 })
      .toArray();

    return docs.map(mapMongoDoc);
  });
}

async function getAdventureImage(id) {
  return withMongoRetry(async function () {
    const collection = await getMongoCollection();
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const doc = await collection.findOne(query, {
      projection: { image_data: 1 },
    });
    return doc ? doc.image_data : null;
  });
}

async function getAdventure(id) {
  return withMongoRetry(async function () {
    const collection = await getMongoCollection();
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const doc = await collection.findOne(query);
    return mapMongoDoc(doc);
  });
}

async function createAdventure(data) {
  return withMongoRetry(async function () {
    const payload = normalizeInput(data);
    const now = new Date().toISOString();
    const record = { ...payload, created_at: now, updated_at: now };
    const collection = await getMongoCollection();
    const result = await collection.insertOne(record);
    return mapMongoDoc({ _id: result.insertedId, ...record });
  });
}

async function updateAdventure(id, data) {
  return withMongoRetry(async function () {
    const payload = normalizeInput(data);
    const updatedAt = new Date().toISOString();
    const collection = await getMongoCollection();
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const result = await collection.findOneAndUpdate(
      query,
      { $set: { ...payload, updated_at: updatedAt } },
      { returnDocument: "after" }
    );
    const doc = result && result.value ? result.value : result;
    return mapMongoDoc(doc);
  });
}

async function deleteAdventure(id) {
  return withMongoRetry(async function () {
    const collection = await getMongoCollection();
    const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
    const result = await collection.deleteOne(query);
    return result.deletedCount > 0;
  });
}

/* =========================================
   CRUD USUÁRIOS
========================================= */

async function getUserByUsername(username) {
  return withMongoRetry(async function () {
    const uname = String(username || "").toLowerCase();
    const collection = await getMongoUsersCollection();
    const doc = await collection.findOne({ username: uname });
    return mapMongoDoc(doc);
  });
}

async function createUser(data) {
  return withMongoRetry(async function () {
    const payload = normalizeUser(data);
    const collection = await getMongoUsersCollection();
    const result = await collection.insertOne(payload);
    return mapMongoDoc({ _id: result.insertedId, ...payload });
  });
}

async function listUsers() {
  return withMongoRetry(async function () {
    const collection = await getMongoUsersCollection();
    const docs = await collection.find({}).toArray();
    return docs.map(mapMongoDoc);
  });
}

async function deleteUser(id) {
  return withMongoRetry(async function () {
    const collection = await getMongoUsersCollection();
    const query = isObjectId(id)
      ? { _id: new ObjectId(id) }
      : { id: Number(id) || id };
    const result = await collection.deleteOne(query);
    return result.deletedCount > 0;
  });
}

async function closeMongo() {
  await resetMongoState();
}

if (MONGO_URI) {
  console.log("[BRAZUG] MongoDB host:", mongoHostForLog());
} else {
  console.error("[BRAZUG] MONGODB_URI não definida — API de dados indisponível");
}

/* =========================================
   EXPORTS
========================================= */

module.exports = {
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
  closeMongo,
  pingMongo,
  mongoHostForLog,
};
