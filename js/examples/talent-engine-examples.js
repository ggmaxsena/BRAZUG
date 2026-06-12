/**
 * EXAMPLE: Como usar o TalentTreeEngine em diferentes contextos
 * Este arquivo contém exemplos práticos de integração
 */

// ════════════════════════════════════════════════════════════════
// EXEMPLO 1: Inicialização Simples
// ════════════════════════════════════════════════════════════════

// Cenário: Carregar árvore de talentos para um Guerreiro
function initWarriorTalents() {
  const container = document.querySelector('#tp-trees-container');
  if (!container) {
    console.error('Container não encontrado');
    return;
  }

  const charClass = 'warrior';
  const treeData = TALENT_TREES_DATA[charClass].trees;

  // Inicializar engine
  const success = TalentTreeEngine.init(charClass, treeData, '#tp-trees-container');

  if (success) {
    console.log('✅ Árvores carregadas com sucesso');
    console.log(`Total de pontos: ${TalentTreeEngine.getTotalPoints()}`);
  } else {
    console.error('❌ Erro ao inicializar engine');
  }
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 2: Carregar Distribuição de Personagem
// ════════════════════════════════════════════════════════════════

// Cenário: Personagem com alocação específica
function loadCharacterTalents(characterData) {
  // Dados típicos da API
  const charClass = 'warrior';
  const treeData = TALENT_TREES_DATA[charClass].trees;

  // Inicializar
  TalentTreeEngine.init(charClass, treeData, '#tp-trees-container');

  // Distribuição de talentos (matriz por tree)
  const distribution = {
    arms: [
      [5, 0, 2, 0],    // Tier 1: 5 pts em col 0, 2 pts em col 2
      [3, 5, 0, 0],    // Tier 2: 3 pts em col 0, 5 pts em col 1
      [0, 1, 0, 0],    // Tier 3: 1 pt em col 1
      [0, 2, 0, 0],    // Tier 4: 2 pts em col 1
      [0, 1, 1, 0],    // Tier 5: 1 pt col 1, 1 pt col 2
      [0, 3, 0, 0],    // Tier 6: 3 pts em col 1
      [0, 0, 0, 0],    // Tier 7: vazio
      [0, 0, 0, 0],    // Tier 8: vazio
      [0, 1, 0, 0]     // Tier 9 (spec): 1 pt em col 1
    ],
    fury: [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    protection: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  };

  // Carregar distribuição
  TalentTreeEngine.loadFromCharacter(distribution);
  console.log(`✅ Carregado: ${TalentTreeEngine.getTotalPoints()} pontos gastos`);
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 3: Manipular Pontos Programaticamente
// ════════════════════════════════════════════════════════════════

// Adicionar pontos a um talento específico
function allocateTalent(treeKey, row, col) {
  const talent = TalentTreeEngine.getTalent(treeKey, row, col);

  if (!talent) {
    console.warn(`Talento não encontrado: ${treeKey}[${row}][${col}]`);
    return false;
  }

  if (TalentTreeEngine.canAdd(treeKey, talent)) {
    const success = TalentTreeEngine.addPoint(treeKey, talent);
    console.log(`${success ? '✅' : '❌'} ${talent.name}: ${talent.rank}/${talent.maxRank}`);
    return success;
  } else {
    console.warn(`❌ Não pode adicionar ponto em: ${talent.name}`);
    console.log(`  - Pontos totais: ${TalentTreeEngine.getTotalPoints()}/51`);
    console.log(`  - Máximo do talento: ${talent.rank}/${talent.maxRank}`);
    console.log(`  - Tier desbloqueado: ${TalentTreeEngine.tierUnlocked(treeKey, talent.row)}`);
    console.log(`  - Pré-requisito atendido: ${TalentTreeEngine.prereqMet(treeKey, talent)}`);
    return false;
  }
}

// Remover pontos
function deallocateTalent(treeKey, row, col) {
  const talent = TalentTreeEngine.getTalent(treeKey, row, col);

  if (!talent) {
    console.warn(`Talento não encontrado: ${treeKey}[${row}][${col}]`);
    return false;
  }

  if (TalentTreeEngine.canRemove(treeKey, talent)) {
    const success = TalentTreeEngine.removePoint(treeKey, talent);
    console.log(`${success ? '✅' : '❌'} Removido de ${talent.name}: ${talent.rank}/${talent.maxRank}`);
    return success;
  } else {
    console.warn(`❌ Não pode remover ponto de: ${talent.name}`);
    return false;
  }
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 4: Exportar e Salvar Build
// ════════════════════════════════════════════════════════════════

// Exportar estado atual
function saveBuildToLocalStorage(buildName) {
  const distribution = TalentTreeEngine.exportToCharacter();
  const totalPts = TalentTreeEngine.getTotalPoints();

  const build = {
    id: Date.now(),
    name: buildName,
    timestamp: new Date().toISOString(),
    totalPoints: totalPts,
    distribution: distribution,
    // Informações adicionais
    class: 'warrior',
    description: 'Minha build customizada'
  };

  // Salvar
  localStorage.setItem(`build_${build.id}`, JSON.stringify(build));
  console.log(`✅ Build "${buildName}" salva`);
  return build;
}

// Carregar build salva
function loadBuildFromLocalStorage(buildId) {
  const buildJson = localStorage.getItem(`build_${buildId}`);

  if (!buildJson) {
    console.error(`Build ${buildId} não encontrada`);
    return null;
  }

  const build = JSON.parse(buildJson);
  console.log(`Carregando: ${build.name} (${build.totalPoints} pts)`);

  // Inicializar engine e carregar distribuição
  const treeData = TALENT_TREES_DATA[build.class].trees;
  TalentTreeEngine.init(build.class, treeData, '#tp-trees-container');
  TalentTreeEngine.loadFromCharacter(build.distribution);

  return build;
}

// Listar todas as builds salvas
function listSavedBuilds() {
  const builds = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('build_')) {
      const build = JSON.parse(localStorage.getItem(key));
      builds.push(build);
    }
  }

  console.log(`Found ${builds.length} saved builds:`);
  builds.forEach(b => {
    console.log(`  📊 ${b.name} (${b.totalPoints} pts) - ${new Date(b.timestamp).toLocaleString()}`);
  });

  return builds;
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 5: Comparar Builds
// ════════════════════════════════════════════════════════════════

// Comparar dois builds
function compareTalentBuilds(build1, build2) {
  console.log(`\n📊 Comparando: "${build1.name}" vs "${build2.name}"`);
  console.log('════════════════════════════════════════');

  const trees = Object.keys(build1.distribution);

  trees.forEach(treeKey => {
    const tree1 = build1.distribution[treeKey];
    const tree2 = build2.distribution[treeKey];

    let differences = 0;

    for (let row = 0; row < tree1.length; row++) {
      for (let col = 0; col < tree1[row].length; col++) {
        if (tree1[row][col] !== tree2[row][col]) {
          differences++;
          console.log(
            `  ${treeKey} [${row},${col}]: ${tree1[row][col]} → ${tree2[row][col]}`
          );
        }
      }
    }

    if (differences === 0) {
      console.log(`  ${treeKey}: ✅ Idêntica`);
    }
  });
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 6: Análise de Build
// ════════════════════════════════════════════════════════════════

// Analisar distribuição de pontos
function analyzeBuild() {
  console.log('\n📈 Análise de Build');
  console.log('════════════════════════════════════════');
  console.log(`Total de pontos: ${TalentTreeEngine.getTotalPoints()}/51`);

  Object.keys(TalentTreeEngine.trees).forEach(treeKey => {
    const tree = TalentTreeEngine.trees[treeKey];
    const pts = TalentTreeEngine.getTreePoints(treeKey);
    const talents = tree.talents;
    const allocated = talents.filter(t => t.rank > 0).length;
    const maxed = talents.filter(t => t.rank === t.maxRank).length;

    console.log(`\n  ${tree.label}:`);
    console.log(`    Pontos: ${pts}/51`);
    console.log(`    Talentos alocados: ${allocated}/${talents.length}`);
    console.log(`    Talentos maxeados: ${maxed}/${talents.length}`);
  });
}

// Mostrar talentos não utilizados
function showUnusedTalents() {
  console.log('\n🔍 Talentos Disponíveis (Não Alocados)');
  console.log('════════════════════════════════════════');

  Object.keys(TalentTreeEngine.trees).forEach(treeKey => {
    const tree = TalentTreeEngine.trees[treeKey];
    const unused = tree.talents.filter(t => t.rank === 0 && TalentTreeEngine.tierUnlocked(treeKey, t.row));

    if (unused.length > 0) {
      console.log(`\n${tree.label}:`);
      unused.forEach(t => {
        const prereqMet = TalentTreeEngine.prereqMet(treeKey, t);
        const status = prereqMet ? '✅' : '🔒';
        console.log(`  ${status} [${t.row},${t.col}] ${t.name} (${t.maxRank} ranks)`);
      });
    }
  });
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 7: Event Listeners Customizados
// ════════════════════════════════════════════════════════════════

// Monitorar mudanças de pontos
function setupTalentChangeListener() {
  let lastTotal = TalentTreeEngine.getTotalPoints();

  setInterval(() => {
    const currentTotal = TalentTreeEngine.getTotalPoints();

    if (currentTotal !== lastTotal) {
      console.log(`📊 Pontos: ${lastTotal} → ${currentTotal}`);
      lastTotal = currentTotal;

      // Trigger custom event
      document.dispatchEvent(new CustomEvent('talentPointsChanged', {
        detail: { points: currentTotal }
      }));
    }
  }, 100);

  // Ouvir evento
  document.addEventListener('talentPointsChanged', (e) => {
    console.log(`Evento: ${e.detail.points} pontos gastos`);
  });
}


// ════════════════════════════════════════════════════════════════
// EXEMPLO 8: Integração com ArmoryController
// ════════════════════════════════════════════════════════════════

// Dentro de ArmoryController.initTP()
function integrateWithArmory(characterData) {
  const charClass = normalizeClass(characterData.class);
  const treeData = TALENT_TREES_DATA[charClass].trees;

  // Inicializar
  TalentTreeEngine.init(charClass, treeData, '#tp-trees-container');

  // Carregar distribuição atual se disponível
  if (characterData.extra_data?.talent_distribution) {
    TalentTreeEngine.loadFromCharacter(characterData.extra_data.talent_distribution);
  }

  // Hooks para os botões
  document.querySelector('[onclick*="resetTPToCurrent"]')
    ?.addEventListener('click', () => {
      TalentTreeEngine.reset();
      TalentTreeEngine.loadFromCharacter(
        characterData.extra_data?.talent_distribution || {}
      );
    });

  document.querySelector('[onclick*="clearTP"]')
    ?.addEventListener('click', () => {
      TalentTreeEngine.reset();
    });
}


// ════════════════════════════════════════════════════════════════
// USO RÁPIDO
// ════════════════════════════════════════════════════════════════

/*
// 1. Inicializar
initWarriorTalents();

// 2. Verificar estado
console.log(`Pontos: ${TalentTreeEngine.getTotalPoints()}`);

// 3. Adicionar ponto
allocateTalent('arms', 0, 0);

// 4. Remover ponto
deallocateTalent('arms', 0, 0);

// 5. Salvar build
saveBuildToLocalStorage('Meu Warrior PvP');

// 6. Analisar
analyzeBuild();

// 7. Exportar
const exported = TalentTreeEngine.exportToCharacter();
console.log(JSON.stringify(exported));
*/

// ════════════════════════════════════════════════════════════════
// FIM DOS EXEMPLOS
// ════════════════════════════════════════════════════════════════
