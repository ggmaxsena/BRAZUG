const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getBlizzardToken() {
  const envPath = path.join(__dirname, '.env');
  const env = fs.readFileSync(envPath, 'utf8');
  const clientId = env.match(/BLIZZARD_CLIENT_ID="?([^"\n]+)"?/)[1];
  const clientSecret = env.match(/BLIZZARD_CLIENT_SECRET="?([^"\n]+)"?/)[1];
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    `https://us.battle.net/oauth/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

async function forceSync(name, realm) {
  // Parsing original URL to encode password
  const originalUrl = 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug';
  const urlObj = new URL(originalUrl);
  const password = encodeURIComponent(urlObj.password);
  const connectionString = `postgresql://${urlObj.username}:${password}@${urlObj.host}${urlObj.pathname}`;
  
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`Force syncing ${name}-${realm}...`);
    const token = await getBlizzardToken();
    const ns = "profile-classic1x-us";
    
    const url = `https://us.api.blizzard.com/profile/wow/character/${realm}/${name}?namespace=${ns}&locale=pt_BR`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const profile = res.data;

    const char = await prisma.character.upsert({
      where: { name_realm_region: { name: profile.name, realm: profile.realm.name, region: 'us' } },
      update: {
        class: profile.character_class.name,
        race: profile.race.name,
        gender: profile.gender.name,
        level: profile.level,
        guild: profile.guild?.name || null,
        extraData: profile,
        updatedAt: new Date()
      },
      create: {
        name: profile.name,
        realm: profile.realm.name,
        region: 'us',
        class: profile.character_class.name,
        race: profile.race.name,
        gender: profile.gender.name,
        level: profile.level,
        guild: profile.guild?.name || null,
        extraData: profile
      }
    });

    console.log(`Successfully synced ${name}! ID: ${char.id}`);
  } catch (e) {
    console.error('Sync failed:', e.response?.data || e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

forceSync('skazao', 'doomhowl');
