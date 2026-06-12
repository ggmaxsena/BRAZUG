// Script para verificar e enriquecer dados de talentos do ggmax
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function getBlizzardToken() {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = process.env.BLIZZARD_REGION || 'us';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await axios.post(
      `https://${region}.battle.net/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (e) {
    console.error('Error getting token:', e.message);
    throw e;
  }
}

async function getSpecsData(realm, character, token) {
  const region = process.env.BLIZZARD_REGION || 'us';
  const namespace = process.env.BLIZZARD_NAMESPACE || 'profile-classic1x-us';

  try {
    const response = await axios.get(
      `https://${region}.api.blizzard.com/profile/wow/character/${realm}/${character}/specializations`,
      {
        params: {
          access_token: token,
          namespace: namespace,
          locale: 'pt_BR'
        }
      }
    );
    return response.data;
  } catch (e) {
    console.error(`Error fetching specs for ${character}-${realm}:`, e.response?.status, e.message);
    return null;
  }
}

async function main() {
  try {
    console.log('🔄 Obtendo token do Blizzard...');
    const token = await getBlizzardToken();
    console.log('✓ Token obtido');

    console.log('\n📊 Buscando dados de especialização de ggmax-Old Blanchy...');
    const specs = await getSpecsData('old-blanchy', 'ggmax', token);

    if (!specs) {
      console.log('❌ Não consegui buscar os dados');
      return;
    }

    console.log('\n=== DADOS DE ESPECIALIZAÇÃO ===\n');

    if (specs.specialization_groups) {
      const totalSpecs = specs.specialization_groups.reduce(
        (sum, g) => sum + (g.specializations?.length || 0),
        0
      );

      console.log(`Total de árvores: ${totalSpecs}`);

      specs.specialization_groups.forEach((group, gi) => {
        console.log(`\n📦 Grupo ${gi} (${group.is_active ? 'ATIVO' : 'inativo'}):`);

        group.specializations?.forEach((spec, si) => {
          const talentCount = spec.talents?.length || 0;
          const pointsSpent = spec.talents?.reduce((sum, t) => sum + (t.talent_rank || 0), 0) || 0;

          console.log(`\n  🌳 [${si}] ${spec.specialization_name}`);
          console.log(`     ID: ${spec.specialization_id}`);
          console.log(`     Talentos: ${talentCount}`);
          console.log(`     Pontos gastos: ${pointsSpent}`);

          if (talentCount > 0) {
            console.log(`     ✓ Dados disponíveis`);
          } else {
            console.log(`     ⚠️  Sem talentos (árvore vazia)`);
          }
        });
      });
    }

  } catch (e) {
    console.error('Erro:', e.message);
  }
}

main();
