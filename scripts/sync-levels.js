"use strict";

const pg = require("pg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Carrega as variáveis de ambiente de forma unificada (DRY)
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const idx = t.indexOf("=");
      const k = t.substring(0, idx).trim();
      const v = t.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[k] = v;
    }
  }
}
loadEnv();

const REALM = "doomhowl";
const REGION = "us";
const LOCALE = "pt_BR";

async function getBlizzardToken() {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("BLIZZARD_CLIENT_ID ou BLIZZARD_CLIENT_SECRET não definidos no arquivo .env");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await axios.post(
      `https://${REGION}.battle.net/oauth/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  } catch (e) {
    console.error("[AUTH] Failed to get token:", e.response?.data || e.message);
    throw e;
  }
}

async function syncLevels() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found in .env");
    return;
  }

  const pool = new pg.Pool({ connectionString: dbUrl });

  try {
    const token = await getBlizzardToken();
    console.log("[SYNC] Authenticated with Blizzard.");

    // Busca os personagens cadastrados na tabela wow_characters
    const res = await pool.query("SELECT id, name, realm, region FROM wow_characters");
    const characters = res.rows;

    let success = 0;
    let failed = 0;

    for (const char of characters) {
      const charRealm = char.realm || REALM;
      const charRegion = char.region || REGION;
      const url = `https://${charRegion}.api.blizzard.com/profile/wow/character/${charRealm}/${char.name.toLowerCase()}`;

      try {
        const response = await axios.get(url, {
          params: { namespace: `profile-classic1x-${charRegion}`, locale: LOCALE },
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        if (profile && profile.level) {
          await pool.query(
            "UPDATE wow_characters SET level = $1, class = $2, race = $3 WHERE id = $4",
            [profile.level, profile.character_class.name, profile.race.name, char.id]
          );
          console.log(`[SYNC] Updated ${char.name}: Level ${profile.level}`);
          success++;
        }
      } catch (e) {
        if (e.response && e.response.status === 404) {
          console.warn(`[SYNC] Character ${char.name} not found on Blizzard.`);
        } else {
          console.error(`[SYNC] Error syncing ${char.name}:`, e.message);
        }
        failed++;
      }
    }

    console.log(`[SYNC] Completed. Success: ${success}, Failed: ${failed}`);
  } catch (e) {
    console.error("[SYNC] Critical failure:", e.message);
  } finally {
    await pool.end();
  }
}

syncLevels();
