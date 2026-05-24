"use strict";

const { MongoClient } = require("mongodb");

async function listAllDbs() {
  const uri = "mongodb+srv://exssgg_db_user:JLJQmkO9IkgVuC6S@cluster0.ie4v7tk.mongodb.net/Brazug?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Conectado ao Cluster.");

    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    
    console.log("Bancos de dados encontrados no cluster:");
    for (let dbInfo of dbs.databases) {
      console.log(` - DB: ${dbInfo.name}`);
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      for (let col of collections) {
        if (col.name === "users") {
          const count = await db.collection("users").countDocuments();
          console.log(`    -> Coleção 'users' encontrada com ${count} documentos.`);
          const users = await db.collection("users").find({}).toArray();
          users.forEach(u => console.log(`       * Usuário: ${u.username}`));
        }
      }
    }

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

listAllDbs();