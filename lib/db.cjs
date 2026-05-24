"use strict";

const dns = require("dns");
const dnsPromises = dns.promises;
const { MongoClient, ObjectId } = require("mongodb");

/* =========================================
   CONFIG
========================================= */

function pickRawMongoUri() {
  const standard = String(
    process.env.MONGODB_URI_STANDARD || ""
  ).trim();
  const regular = String(process.env.MONGODB_URI || "").trim();

  // Só usar STANDARD se for mongodb:// (hosts explícitos).
  if (standard.startsWith("mongodb://")) {
    return standard;
  }

  if (standard.startsWith("mongodb+srv://")) {
    console.warn(
      "[BRAZUG] MONGODB_URI_STANDARD não pode ser SRV; use mongodb:// ou só MONGODB_URI"
    );
    return standard;
  }

  return regular || standard;
}

const MONGO_URI_RAW = pickRawMongoUri();

let resolvedMongoUri = null;

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
  const uri = resolvedMongoUri || MONGO_URI_RAW;
  if (!uri) {
    return null;
  }

  const match = uri.match(/@([^/?]+)/);
  return match ? match[1] : null;
}

function parseMongoSrvUri(uri) {
  const match = uri.match(
    /^mongodb\+srv:\/\/([^/]+)(\/[^?]*)?(\?.*)?$/
  );

  if (!match) {
    throw new Error("MONGODB_URI SRV inválida");
  }

  const authority = match[1];
  const at = authority.lastIndexOf("@");

  if (at === -1) {
    throw new Error("MONGODB_URI SRV sem credenciais");
  }

  return {
    credentials: authority.slice(0, at + 1),
    hostname: authority.slice(at + 1),
    dbPath: match[2] || "",
    query: (match[3] || "").replace(/^\?/, ""),
  };
}

function mergeQueryParams(txtChunks, existingQuery) {
  const params = new URLSearchParams();

  txtChunks.forEach(function (rows) {
    rows.forEach(function (part) {
      part.split("&").forEach(function (pair) {
        const eq = pair.indexOf("=");
        if (eq === -1) {
          return;
        }
        params.set(
          pair.slice(0, eq),
          pair.slice(eq + 1)
        );
      });
    });
  });

  if (!params.has("ssl")) {
    params.set("ssl", "true");
  }

  const existing = new URLSearchParams(existingQuery);
  existing.forEach(function (value, key) {
    params.set(key, value);
  });

  return params.toString();
}

async function srvToStandardUri(srvUri) {
  const parts = parseMongoSrvUri(srvUri);
  const srvName =
    "_mongodb._tcp." + parts.hostname;

  const srvRecords = await dnsPromises.resolveSrv(srvName);
  const txtRecords = await dnsPromises
    .resolveTxt(parts.hostname)
    .catch(function () {
      return [];
    });

  if (!srvRecords.length) {
    throw new Error("Nenhum registro SRV para " + parts.hostname);
  }

  const hosts = srvRecords
    .map(function (record) {
      const name = record.name.replace(/\.$/, "");
      return name + ":" + record.port;
    })
    .join(",");

  const query = mergeQueryParams(
    txtRecords,
    parts.query
  );

  return (
    "mongodb://" +
    parts.credentials +
    hosts +
    parts.dbPath +
    "?" +
    query
  );
}

function buildStandardFromEnvShards(srvUri) {
  const shardHosts = String(
    process.env.MONGODB_SHARD_HOSTS || ""
  ).trim();

  if (!shardHosts) {
    throw new Error(
      "SRV indisponível. No painel Hostinger defina MONGODB_URI_STANDARD (mongodb:// do Atlas) ou MONGODB_SHARD_HOSTS."
    );
  }

  const parts = parseMongoSrvUri(srvUri);
  const params = new URLSearchParams(parts.query);

  params.set("ssl", "true");
  params.set(
    "authSource",
    process.env.MONGODB_AUTH_SOURCE || "admin"
  );

  const replicaSet = String(
    process.env.MONGODB_REPLICA_SET || ""
  ).trim();

  if (replicaSet) {
    params.set("replicaSet", replicaSet);
  }

  return (
    "mongodb://" +
    parts.credentials +
    shardHosts +
    parts.dbPath +
    "?" +
    params.toString()
  );
}

function logAtlasNetworkHint(err) {
  const msg = String((err && err.message) || err || "");
  if (!/ssl|tls|alert number 80/i.test(msg)) {
    return;
  }

  console.error(
    "[BRAZUG] SSL alert 80: no Atlas abra Network Access e adicione 0.0.0.0/0 (Allow from anywhere), aguarde 2 min e reinicie o app."
  );
}

async function resolveConnectionUri() {
  if (resolvedMongoUri) {
    return resolvedMongoUri;
  }

  if (!MONGO_URI_RAW) {
    throw new Error("MONGODB_URI não configurada no ambiente (.env)");
  }

  if (!MONGO_URI_RAW.startsWith("mongodb+srv://")) {
    resolvedMongoUri = MONGO_URI_RAW;
    console.log(
      "[BRAZUG] MongoDB URI (direct):",
      mongoHostForLog()
    );
    return resolvedMongoUri;
  }

  try {
    resolvedMongoUri = await srvToStandardUri(MONGO_URI_RAW);
    console.log(
      "[BRAZUG] mongodb+srv → Standard:",
      mongoHostForLog()
    );
  } catch (err) {
    console.warn(
      "[BRAZUG] Resolução SRV falhou:",
      err.message
    );
    resolvedMongoUri = buildStandardFromEnvShards(
      MONGO_URI_RAW
    );
    console.log(
      "[BRAZUG] Standard via MONGODB_SHARD_HOSTS:",
      mongoHostForLog()
    );
  }

  return resolvedMongoUri;
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
  const connectionUri = await resolveConnectionUri();

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
      connectionUri,
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
    logAtlasNetworkHint(err);
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
  if (!MONGO_URI_RAW) {
    return { ok: false, error: "MONGODB_URI não configurada" };
  }

  try {
    const client = await initMongoClient();
    await client.db(MONGO_DB_NAME).command({ ping: 1 });
    return {
      ok: true,
      host: mongoHostForLog(),
      mode: MONGO_URI_RAW.startsWith("mongodb+srv://")
        ? "standard-from-srv"
        : "direct",
    };
  } catch (err) {
    return {
      ok: false,
      host: mongoHostForLog(),
      error: err.message,
    };
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

if (MONGO_URI_RAW) {
  console.log(
    "[BRAZUG] MongoDB configurado:",
    MONGO_URI_RAW.startsWith("mongodb+srv://")
      ? "srv (será resolvido para hosts de shard no connect)"
      : "standard"
  );
} else {
  console.error(
    "[BRAZUG] MONGODB_URI não definida — API de dados indisponível"
  );
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
