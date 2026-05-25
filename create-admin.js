"use strict";

const db = require("./lib/db.cjs");
const auth = require("./lib/auth.cjs");

async function run() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("ERRO: DATABASE_URL não definida no ambiente.");
      process.exit(1);
    }

    await db.init();
    
    const username = "admin";
    const password = "Brazug0231";
    
    console.log(`[SETUP] Verificando se o usuário '${username}' existe...`);
    
    const users = await db.listUsers();
    const existing = users.find(u => u.username === username);
    
    if (existing) {
       console.log(`[SETUP] Usuário '${username}' encontrado. Atualizando senha...`);
       await db.updateUserPassword(existing.id, auth.hashPassword(password));
       console.log(`[SETUP] Sucesso! Senha do usuário '${username}' atualizada.`);
       process.exit(0);
    }

    console.log(`[SETUP] Criando novo usuário '${username}'...`);
    await db.createUser({
      username: username,
      password: auth.hashPassword(password),
      role: "admin"
    });

    console.log(`[SETUP] Sucesso! Usuário '${username}' criado com a senha 'Brazug0231'.`);
    process.exit(0);
  } catch (err) {
    console.error("[SETUP] Erro fatal:", err);
    process.exit(1);
  }
}

run();
