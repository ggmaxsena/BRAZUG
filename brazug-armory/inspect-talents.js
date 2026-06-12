const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const char = await prisma.character.findFirst({
      where: { name: 'ggmax' },
      select: { extra_data: true }
    });

    if (char && char.extra_data) {
      const specs = char.extra_data.specializations?.specialization_groups || [];
      if (specs.length > 0) {
        const activeGroup = specs[0];
        console.log('\n=== GRUPO DE ESPECIALIZAÇÃO ===');
        console.log('Total de specs:', activeGroup.specializations?.length || 0);

        activeGroup.specializations?.forEach((spec, i) => {
          console.log(`\n[Spec ${i}] ${spec.specialization_name}`);
          console.log('Total de talentos:', spec.talents?.length || 0);
          console.log('Pontos gastos:', spec.talents?.reduce((a,t) => a + (t.talent_rank || 0), 0) || 0);

          // Breakdown by talent_rank
          const zeroRank = spec.talents?.filter(t => !t.talent_rank || t.talent_rank === 0).length || 0;
          const withRank = spec.talents?.filter(t => t.talent_rank && t.talent_rank > 0).length || 0;
          console.log(`  - Com 0 pontos: ${zeroRank}, Com pontos: ${withRank}`);

          console.log('\nPrimeiros 10 talentos:');
          (spec.talents || []).slice(0, 10).forEach((t, idx) => {
            const desc = t.spell_tooltip?.spell?.description || 'Sem descrição';
            const truncDesc = desc.substring(0, 40) + (desc.length > 40 ? '...' : '');
            console.log(`  [${idx}] ${t.talent.name} (${t.talent_rank}/${t.talent.max_rank}) - "${truncDesc}"`);
          });
        });
      }
    } else {
      console.log('Personagem não encontrado');
    }
  } catch(e) {
    console.error('Erro:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
