const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function test() {
  const connectionString = 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Testing Item upsert with tooltipData...');
    const res = await prisma.item.upsert({
      where: { id: 12345 },
      update: {
        name: 'Test Item',
        quality: 'EPIC',
        tooltipData: { some: 'data' }
      },
      create: {
        id: 12345,
        name: 'Test Item',
        quality: 'EPIC',
        tooltipData: { some: 'data' }
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
