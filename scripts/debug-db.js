const db = require('../lib/db.cjs');

async function debugTable() {
  const client = await db.getPool();
  
  console.log("--- Estrutura da tabela 'item' ---");
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'item'
  `);
  console.table(cols.rows);

  console.log("\n--- Exemplo de 1 item ---");
  const sample = await client.query("SELECT * FROM item LIMIT 1");
  console.log(sample.rows[0]);

  await db.closePool();
}

debugTable().catch(console.error);
