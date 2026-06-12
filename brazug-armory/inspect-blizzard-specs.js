// Script para inspecionar dados de especialização sincronizados
const https = require('https');
require('dotenv').config();

const ACCESS_TOKEN = process.env.BLIZZARD_ACCESS_TOKEN;
const REGION = 'us'; // ou 'eu'
const REALM = 'Old Blanchy'; // ou outro realm
const CHARACTER = 'ggmax';

async function fetchFromBlizzard(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'us.api.blizzard.com',
      path: `${path}?access_token=${ACCESS_TOKEN}&namespace=profile-classic1x-us`,
      method: 'GET',
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function inspectSpecializations() {
  try {
    console.log(`\n📊 Inspecionando especializations de ${CHARACTER}-${REALM}...\n`);

    const path = `/profile/wow/character/${REALM.toLowerCase().replace(/ /g, '-')}/${CHARACTER.toLowerCase()}/specializations`;
    const specs = await fetchFromBlizzard(path);

    console.log('=== ESTRUTURA COMPLETA ===');
    console.log(JSON.stringify(specs, null, 2));

    console.log('\n=== ANÁLISE ===');
    if (specs.specialization_groups) {
      specs.specialization_groups.forEach((group, gi) => {
        console.log(`\n[Grupo ${gi}]`);
        console.log(`  is_active: ${group.is_active}`);
        console.log(`  Specializations: ${group.specializations?.length || 0}`);

        group.specializations?.forEach((spec, si) => {
          console.log(`\n  [Spec ${si}] ${spec.specialization_name}`);
          console.log(`    specialization_id: ${spec.specialization_id}`);
          console.log(`    talents count: ${spec.talents?.length || 0}`);

          if (spec.talents && spec.talents.length > 0) {
            console.log(`    Primeiros 3 talentos:`);
            spec.talents.slice(0, 3).forEach(t => {
              console.log(`      - ${t.talent?.name || 'N/A'} (${t.talent_rank}/${t.talent?.max_rank})`);
            });
          } else {
            console.log(`    ⚠️  Sem talentos!`);
          }
        });
      });
    }
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

inspectSpecializations();
