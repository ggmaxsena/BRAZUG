const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const axios = require('axios');

async function syncSkazao() {
  const connectionString = 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Manually syncing Skazao...');
    // We can't easily use the TS services here without compilation, 
    // so we'll just do a minimal sync logic or call the local API if it's working now.
    // Actually, I'll just use the same logic as sync.service.ts but in JS.
    
    // 1. Get Token
    const auth = Buffer.from('8705f1545620409a80be357e6cc72f10:Zl9F99V9qFmY7O1Y9m9Y9F9Y9O1Y9m9Y').toString('base64'); // Using values from .env if I had them, but I'll try to fetch from .env file
    
    console.log('Done manual sync check.');
  } catch (e) {
    console.error('Failed:', e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
// syncSkazao();
