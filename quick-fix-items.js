const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug' });

async function quickFixItems() {
    const itemsToInsert = [
        {id: 4782, name: 'Veste do Solstício', quality: 'UNCOMMON'},
        {id: 4786, name: 'Cinto do Homem Sábio', quality: 'UNCOMMON'},
        {id: 14119, name: 'Tanga Aborígene da Coruja', quality: 'UNCOMMON'},
        {id: 3307, name: 'Botas de Tecido Barbarescas', quality: 'UNCOMMON'},
        {id: 3373, name: 'Braçadeiras de Retalhos', quality: 'POOR'},
        {id: 5337, name: 'Luvas da Jornada', quality: 'UNCOMMON'},
        {id: 5343, name: 'Manto de Taberneiro', quality: 'UNCOMMON'},
        {id: 5340, name: 'Mexedor de Caldeirão', quality: 'UNCOMMON'},
        {id: 11287, name: 'Varinha Mágica Inferior', quality: 'UNCOMMON'},
        {id: 5976, name: 'Tabardo de Guilda', quality: 'COMMON'}
    ];

    for (const item of itemsToInsert) {
        try {
            await pool.query('INSERT INTO armory."Item" (id, name, quality) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [item.id, item.name, item.quality]);
        } catch (e) {
            console.error(`Error inserting ${item.id}:`, e);
        }
    }
    pool.end();
}
quickFixItems();
