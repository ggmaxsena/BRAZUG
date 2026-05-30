const { Items } = require('wow-classic-items');
const db = require('../lib/db.cjs');

async function seedItems() {
  console.log('[SEED] Iniciando importação de itens...');
  
  const client = await db.getPool();
  const dbItems = new Items();
  const itemList = Object.values(dbItems);
  
  console.log(`[SEED] Encontrados ${itemList.length} itens. Começando upsert...`);

  let count = 0;
  for (const item of itemList) {
    // Extrai o nome do arquivo do ícone da URL completa
    const iconFilename = item.icon ? item.icon.split('/').pop() : null;

    try {
      await client.query(
        `INSERT INTO item (id, name, quality, slot, icon_filename)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           quality = EXCLUDED.quality,
           slot = EXCLUDED.slot,
           icon_filename = EXCLUDED.icon_filename`,
        [item.itemId, item.name, item.quality, item.slot, iconFilename]
      );
      count++;
      if (count % 1000 === 0) console.log(`[SEED] ${count} itens processados...`);
    } catch (e) {
      console.error(`[SEED] Erro ao inserir item ${item.itemId}: ${e.message}`);
    }
  }

  console.log(`[SEED] Importação concluída! Total de itens: ${count}`);
  await db.closePool();
  process.exit(0);
}

seedItems();
