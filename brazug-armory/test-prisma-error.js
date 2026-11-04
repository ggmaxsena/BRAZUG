const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function test() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada.");
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
