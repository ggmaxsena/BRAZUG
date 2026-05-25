"use strict";

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar .env se existir
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  });
}

async function run() {
  const connectionString = process.env.DATABASE_URL || "postgresql://brazug:BrazugUgjd8dO2Gmabs!25@localhost:5432/brazug";
  console.log("[MIGRATION] Usando banco:", connectionString.split('@')[1] || "local");
  const pool = new Pool({ connectionString });

  try {
    console.log("[MIGRATION] Conectando ao banco...");
    const client = await pool.connect();

    try {
      console.log("[MIGRATION] Adicionando coluna user_id...");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE");
      
      console.log("[MIGRATION] Adicionando coluna visibility...");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'");
      
      console.log("[MIGRATION] Adicionando colunas de morte...");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS is_dead BOOLEAN NOT NULL DEFAULT FALSE");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS death_cause TEXT DEFAULT ''");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS death_location TEXT DEFAULT ''");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS death_level INTEGER DEFAULT NULL");
      
      console.log("[MIGRATION] Adicionando colunas de armory...");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us'");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS realm TEXT DEFAULT 'doomhowl'");

      console.log("[MIGRATION] Adicionando novas colunas de profissão (ListBox)...");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof1_name TEXT DEFAULT ''");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof1_lvl INTEGER DEFAULT 0");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof2_name TEXT DEFAULT ''");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof2_lvl INTEGER DEFAULT 0");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof_cooking_lvl INTEGER DEFAULT 0");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof_aid_lvl INTEGER DEFAULT 0");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS prof_fishing_lvl INTEGER DEFAULT 0");

      console.log("[MIGRATION] Adicionando colunas de redes sociais...");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS twitch_url TEXT DEFAULT ''");
      await client.query("ALTER TABLE wow_characters ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT ''");

      console.log("[MIGRATION] Adicionando colunas de e-mail e verificação na tabela users...");
      await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE");
      await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE");
      await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT");
      await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT");
      await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ");

      console.log("[MIGRATION] Criando índices...");
      await client.query("CREATE INDEX IF NOT EXISTS idx_characters_user_id ON wow_characters (user_id)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_characters_visibility ON wow_characters (visibility)");

      console.log("[MIGRATION] Sucesso! Banco de dados atualizado.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[MIGRATION] Erro fatal:", err.message);
  } finally {
    await pool.end();
  }
}

run();
