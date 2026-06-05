const db = require('../lib/db.cjs');
const Items = require('wow-classic-items');

async function fixItems() {
  const itemsLib = new Items.Items();
  const client = await db.getPool();
  
  try {
    console.log("Buscando itens na tabela armory.\"Item\"...");
    const res = await client.query('SELECT * FROM armory."Item"');
    console.log(`Encontrados ${res.rows.length} itens.`);

    for (const row of res.rows) {
      const libItem = itemsLib.find(i => i.itemId === row.id);
      if (libItem) {
        let iconName = libItem.icon;
        if (iconName && iconName.includes('/')) {
            const parts = iconName.split('/');
            iconName = parts[parts.length - 1].replace('.jpg', '');
        }

        const tooltipData = {
            level: libItem.itemLevel,
            required_level: libItem.requiredLevel,
            inventory_type: { name: libItem.slot },
            item_subclass: { name: libItem.subclass },
            quality: { type: libItem.quality.toUpperCase() },
            stats: libItem.tooltip.filter(line => line.label.startsWith('+')).map(line => ({
                display: { display_string: line.label }
            })),
            spells: libItem.tooltip.filter(line => line.label.startsWith('Equip:') || line.label.startsWith('Use:')).map(line => ({
                description: line.label
            })),
            description: libItem.tooltip.find(line => line.format === 'FlavorText')?.label,
            wow_classic_items_raw: libItem
        };

        await client.query(
          'UPDATE armory."Item" SET name = $1, quality = $2, icon = $3, tooltip_data = $4 WHERE id = $5',
          [libItem.name, libItem.quality.toUpperCase(), iconName, JSON.stringify(tooltipData), row.id]
        );
        console.log(`Fix: [${row.id}] ${libItem.name} -> Icon: ${iconName}`);
      }
    }
    console.log("Processo concluído!");
  } catch (err) {
    console.error("Erro durante o fix:", err);
  } finally {
    await db.closePool();
  }
}

fixItems();
