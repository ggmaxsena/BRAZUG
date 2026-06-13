const { Pool } = require('pg');
const connectionString = 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug';
const pool = new Pool({ connectionString });

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('SUCCESS:', res.rows[0]);
  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await pool.end();
  }
}
test();
