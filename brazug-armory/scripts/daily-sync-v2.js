const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const REALM = 'doomhowl';
const GUILD = 'BRAZUG';
const REGION = 'us';
const LOCALE = 'pt_BR';

async function getBlizzardToken() {
  const envPath = path.join(__dirname, '..', '.env');
  let clientId, clientSecret;
  
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    clientId = env.match(/BLIZZARD_CLIENT_ID=([^\s\n\r]+)/)?.[1];
    clientSecret = env.match(/BLIZZARD_CLIENT_SECRET=([^\s\n\r]+)/)?.[1];
  }

  // Fallback
  clientId = clientId || '29b527628acc4b359ca8264325f7cff4';
  clientSecret = clientSecret || 'NlyI0r1IhY8hyuYqImqEBfCV6v43kgFv';
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await axios.post(
      `https://${REGION}.battle.net/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (e) {
    console.error('[AUTH] Failed to get token:', e.response?.data || e.message);
    throw e;
  }
}

async function getGuildRoster(token) {
  const namespaces = [
    'profile-classic1x-us',
    'profile-classic-us',
    'data-classic1x-us'
  ];

  const urls = [
    `https://${REGION}.api.blizzard.com/data/wow/guild/${REALM}/${GUILD.toLowerCase()}/roster`
  ];
  
  for (const url of urls) {
    for (const ns of namespaces) {
      try {
        const res = await axios.get(url, {
          params: { namespace: ns, locale: LOCALE },
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.data.members;
      } catch (e) {
        if (e.response?.status === 404 || e.response?.status === 403) continue;
        throw e;
      }
    }
  }
  throw new Error('Could not find guild roster in any tried URL/namespace');
}

async function syncCharacter(prisma, token, name) {
  const namespaces = [
    'profile-classic1x-us',
    'profile-classic-us',
    'profile-us'
  ];

  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${REALM}/${name.toLowerCase()}`;
  
  let profile = null;
  for (const ns of namespaces) {
    try {
      const res = await axios.get(url, {
        params: { namespace: ns, locale: LOCALE },
        headers: { Authorization: `Bearer ${token}` }
      });
      profile = res.data;
      break;
    } catch (e) {
      if (e.response?.status === 404) continue;
      throw e;
    }
  }

  if (!profile) return false;

  await prisma.character.upsert({
    where: { name_realm_region: { name: profile.name, realm: profile.realm.name, region: REGION } },
    update: {
      class: profile.character_class.name,
      race: profile.race.name,
      gender: profile.gender.name,
      level: profile.level,
      guild: profile.guild?.name || null,
      extraData: profile,
      lastSync: new Date(),
      updatedAt: new Date()
    },
    create: {
      name: profile.name,
      realm: profile.realm.name,
      region: REGION,
      class: profile.character_class.name,
      race: profile.race.name,
      gender: profile.gender.name,
      level: profile.level,
      guild: profile.guild?.name || null,
      extraData: profile,
      lastSync: new Date()
    }
  });

  return true;
}

async function runDailySync() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`[SYNC] Starting sync for ${GUILD}-${REALM}...`);
    const token = await getBlizzardToken();
    
    const members = await getGuildRoster(token);
    
    console.log(`[SYNC] Found ${members.length} members. Starting full sync...`);
    
    let success = 0;
    let failed = 0;

    for (const member of members) {
      const name = member.character.name;
      try {
        const ok = await syncCharacter(prisma, token, name);
        if (ok) {
          console.log(`[SYNC] Synced ${name}`);
          success++;
        } else {
          console.warn(`[SYNC] Could not find profile for ${name}`);
          failed++;
        }
      } catch (e) {
        console.error(`[SYNC] Failed to sync ${name}:`, e.message);
        failed++;
      }
    }

    console.log(`[SYNC] Completed. Success: ${success}, Failed: ${failed}`);
  } catch (e) {
    console.error('[SYNC] Critical failure:', e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runDailySync();
