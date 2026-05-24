"use strict";

const { MongoClient, ObjectId } = require("mongodb");

/* =========================================
   CONFIG
========================================= */

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
    image_url: String(data.image_url || "").trim(),
    image_data: data.image_data || null, // Campo para Base64 ou Binário
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

/* =========================================
   MONGO INIT
========================================= */

async function initMongoClient() {
  if (!MONGO_URI) {
    throw new Error("MONGODB_URI não configurada no ambiente (.env)");
  }

  if (mongoClient) {
    return mongoClient;
  }

  try {
    mongoClient = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await mongoClient.connect();
    console.log("[BRAZUG] MongoDB conectado com sucesso.");
    return mongoClient;
  } catch (err) {
    console.error("[BRAZUG] Falha ao conectar no MongoDB:", err.message);
    throw err;
  }
}

async function getMongoCollection() {
  const client = await initMongoClient();
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
  if (!doc) return null;
  const mapped = {
    id: doc._id ? doc._id.toString() : String(doc.id || ""),
    ...doc
  };
  delete mapped._id;
  return mapped;
}

/* =========================================
   CRUD AVENTURAS
========================================= */

async function listAdventures(publishedOnly = true, visibility = "public") {
  const collection = await getMongoCollection();
  const filter = {};

  if (publishedOnly) {
    filter.published = true;
  }

  if (visibility !== null && visibility !== undefined) {
    filter.visibility = normalizeVisibility(visibility);
  }

  const docs = await collection
    .find(filter)
    .sort({ event_date: -1, created_at: -1 })
    .toArray();

  return docs.map(mapMongoDoc);
}

async function getAdventure(id) {
  const collection = await getMongoCollection();
  const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
  const doc = await collection.findOne(query);
  return mapMongoDoc(doc);
}

async function createAdventure(data) {
  const payload = normalizeInput(data);
  const now = new Date().toISOString();
  const record = { ...payload, created_at: now, updated_at: now };

  const collection = await getMongoCollection();
  const result = await collection.insertOne(record);

  return mapMongoDoc({ _id: result.insertedId, ...record });
}

async function updateAdventure(id, data) {
  const payload = normalizeInput(data);
  const updatedAt = new Date().toISOString();
  const collection = await getMongoCollection();
  
  const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };

  const result = await collection.findOneAndUpdate(
    query,
    { $set: { ...payload, updated_at: updatedAt } },
    { returnDocument: "after" }
  );

  return mapMongoDoc(result.value);
}

async function deleteAdventure(id) {
  const collection = await getMongoCollection();
  const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: id };
  const result = await collection.deleteOne(query);
  return result.deletedCount > 0;
}

/* =========================================
   CRUD USUÁRIOS
========================================= */

async function getUserByUsername(username) {
  const uname = String(username || "").toLowerCase();
  const collection = await getMongoUsersCollection();
  const doc = await collection.findOne({ username: uname });
  return mapMongoDoc(doc);
}

async function createUser(data) {
  const payload = normalizeUser(data);
  const collection = await getMongoUsersCollection();
  const result = await collection.insertOne(payload);
  return mapMongoDoc({ _id: result.insertedId, ...payload });
}

async function listUsers() {
  const collection = await getMongoUsersCollection();
  const docs = await collection.find({}).toArray();
  return docs.map(mapMongoDoc);
}

async function deleteUser(id) {
  const collection = await getMongoUsersCollection();
  const query = isObjectId(id) ? { _id: new ObjectId(id) } : { id: Number(id) || id };
  const result = await collection.deleteOne(query);
  return result.deletedCount > 0;
}

/* =========================================
   CLOSE
========================================= */

async function closeMongo() {
  try {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
    }
  } catch (err) {
    console.error("[BRAZUG] Erro ao fechar MongoDB:", err.message);
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