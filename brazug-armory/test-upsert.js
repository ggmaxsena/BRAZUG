const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function test() {
  const connectionString = 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Testing character upsert (JS)...');
    const res = await prisma.character.upsert({
      where: {
        name_realm_region: {
          name: 'TestCharJS',
          realm: 'Doomhowl',
          region: 'us',
        },
      },
      update: {
        class: 'Warrior',
        race: 'Orc',
        gender: 'Male',
        level: 60,
        extraData: { test: true },
        updatedAt: new Date(),
      },
      create: {
        name: 'TestCharJS',
        realm: 'Doomhowl',
        region: 'us',
        class: 'Warrior',
        race: 'Orc',
        gender: 'Male',
        level: 60,
        extraData: { test: true },
      },
    });
    console.log('Success:', res);
  } catch (e) {
    console.error('Failed:', e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
