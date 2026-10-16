/* ============================================================
   CONVERTE data.json do talentsforever.com para o formato do BRAZUG
   ============================================================
   Rodar: node convert-data.js > talent-data.js
   ============================================================ */

const CLASS_MAP = {
  Warrior:   'warrior',
  Paladin:   'paladin',
  Hunter:    'hunter',
  Rogue:     'rogue',
  Priest:    'priest',
  Shaman:    'shaman',
  Mage:      'mage',
  Warlock:   'warlock',
  Druid:     'druid',
};

const TREE_KEY_MAP = {
  // Warrior
  Arms:        'arms',
  Fury:        'fury',
  Protection:  'protection',
  // Paladin
  Holy:        'holy',
  Retribution: 'retribution',
  // Hunter
  'Beast Mastery': 'beastmastery',
  Marksmanship:    'marksmanship',
  Survival:        'survival',
  // Rogue
  Assassination: 'assassination',
  Combat:        'combat',
  Subtlety:      'subtlety',
  // Priest
  Discipline:    'discipline',
  Shadow:        'shadow',
  // Shaman
  Elemental:     'elemental',
  Enhancement:   'enhancement',
  Restoration:   'restoration',
  // Mage
  Arcane:        'arcane',
  Fire:          'fire',
  Frost:         'frost',
  // Warlock
  Affliction:    'affliction',
  Demonology:    'demonology',
  Destruction:   'destruction',
  // Druid
  Balance:        'balance',
  'Feral Combat': 'feral',
  // Druid Restoration also exists
};

const TREE_ACCENTS = {
  arms:        '#c41f1f',
  fury:        '#d4761a',
  protection:  '#2a6aaf',
  holy:        '#f58cba',
  retribution: '#c41f3b',
  beastmastery:'#abd473',
  marksmanship:'#fff569',
  survival:    '#3fc7ea',
  assassination:'#c41f3b',
  combat:      '#ffffff',
  subtlety:    '#8787ed',
  discipline:  '#ffffff',
  shadow:      '#8787ed',
  elemental:   '#40c7eb',
  enhancement: '#0070de',
  restoration: '#abd473',
  arcane:      '#40c7eb',
  fire:        '#f58cba',
  frost:       '#3fc7ea',
  affliction:  '#c41f3b',
  demonology:  '#c41f3b',
  destruction: '#c41f3b',
  balance:     '#c8b580',
  feral:       '#ff7d0a',
};

const BG_ICONS = {
  arms:        'ability_warrior_savageblow',
  fury:        'spell_nature_bloodlust',
  protection:  'ability_warrior_defensivestance',
  holy:        'spell_holy_holybolt',
  retribution: 'spell_holy_fistofjudgment',
  beastmastery:'ability_hunter_bestialdiscipline',
  marksmanship:'ability_marksmanship',
  survival:    'ability_hunter_swiftstrike',
  assassination:'ability_rogue_deathstrike',
  combat:      'ability_backstab',
  subtlety:    'ability_stealth',
  discipline:  'spell_holy_wordfortitude',
  shadow:      'spell_shadow_shadowwordpain',
  elemental:   'spell_nature_lightning',
  enhancement: 'spell_nature_lightningoverload',
  restoration: 'spell_nature_healingtouch',
  arcane:      'spell_holy_magicalsentry',
  fire:        'spell_fire_fireball02',
  frost:       'spell_frost_frostbolt02',
  affliction:  'spell_shadow_deathcoil',
  demonology:  'spell_shadow_metamorphosis',
  destruction: 'spell_shadow_sealofdestruction',
  balance:     'spell_nature_starfall',
  feral:       'ability_druid_catform',
};

function descFromArray(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.join(' ');
}

function convert(input) {
  const classes = {};

  Object.keys(input.talents).forEach(className => {
    const classKey = CLASS_MAP[className];
    if (!classKey) return;

    const classData = input.talents[className];
    const treesObj = {};

    classData.trees.forEach(tree => {
      const treeKey = TREE_KEY_MAP[tree.name];
      if (!treeKey) {
        console.warn(`// Unknown tree: ${className}.${tree.name}`);
        return;
      }

      // Build name->talent map for prereq resolution
      const talentByName = {};
      tree.talents.forEach(t => {
        talentByName[t.name] = t;
      });

      const talents = tree.talents.map(t => {
        // Find prereq row/col by name
        let prereq = null;
        if (t.req) {
          const p = talentByName[t.req];
          if (p) {
            prereq = { row: p.row - 1, col: p.col - 1 }; // 1-based -> 0-based
          }
        }

        return {
          row: t.row - 1,           // 1-based -> 0-based
          col: t.col - 1,           // 1-based -> 0-based
          icon: t.icon,
          name: t.name,
          maxRank: t.max,
          desc: descFromArray(t.desc),
          ...(prereq ? { prereq } : {}),
          ...(t.cost ? { cost: t.cost } : {}),
        };
      });

      // Mark spec talent: the one at the highest row (final tier)
      // In Forever, the last row is row 7 (1-based) = row 6 (0-based)
      // But some trees might have the spec at different positions
      // We'll mark as spec the talent(s) with maxRank=1 at the deepest row
      const maxRow = Math.max(...talents.map(t => t.row));
      talents.forEach(t => {
        if (t.row === maxRow && t.maxRank === 1) {
          t.spec = true;
        }
      });

      treesObj[treeKey] = {
        label: tree.name,
        accent: TREE_ACCENTS[treeKey] || '#c41e3a',
        bgIcon: BG_ICONS[treeKey] || 'inv_misc_questionmark',
        talents,
      };
    });

    classes[classKey] = {
      label: className,
      trees: treesObj,
    };
  });

  // Output
  console.log('/* ============================================================');
  console.log('   BRAZUG — WoW Forever Talent Data');
  console.log('   Gerado automaticamente de https://talentsforever.com/data.json');
  console.log('   Licença: CC BY 4.0 (creditar talentsforever.com)');
  console.log('   ============================================================ */');
  console.log('');
  console.log('const FOREVER_MAX_PTS = 51;');
  console.log('const FOREVER_PTS_PER_TIER = 5;');
  console.log('const FOREVER_TIER_GOLDS = [11, 16, 21, 31];');
  console.log('');
  console.log(`const CDN = '${'https://wow.zamimg.com/images/wow/icons/medium'}';`);
  console.log('');
  console.log('const CLASS_LABELS = {');
  Object.keys(classes).forEach(k => {
    console.log(`  ${k}: '${classes[k].label}',`);
  });
  console.log('};');
  console.log('');
  console.log('const TREE_LABELS = {');
  Object.keys(classes).forEach(classKey => {
    const cls = classes[classKey];
    console.log(`  ${classKey}: {`);
    Object.keys(cls.trees).forEach(treeKey => {
      console.log(`    ${treeKey}: '${cls.trees[treeKey].label}',`);
    });
    console.log(`  },`);
  });
  console.log('};');
  console.log('');
  console.log('const TREE_ACCENTS = {');
  Object.keys(TREE_ACCENTS).forEach(k => {
    console.log(`  ${k}: '${TREE_ACCENTS[k]}',`);
  });
  console.log('};');
  console.log('');
  console.log('const TREES_DATA = {');
  const classKeys = Object.keys(classes);
  classKeys.forEach((classKey, ci) => {
    const cls = classes[classKey];
    console.log(`  ${classKey}: {`);
    console.log(`    label: '${cls.label}',`);
    console.log(`    trees: {`);
    const treeKeys = Object.keys(cls.trees);
    treeKeys.forEach((treeKey, ti) => {
      const tree = cls.trees[treeKey];
      console.log(`      ${treeKey}: {`);
      console.log(`        label: '${tree.label}',`);
      console.log(`        accent: '${tree.accent}',`);
      console.log(`        bgIcon: '${tree.bgIcon}',`);
      console.log(`        talents: [`);
      tree.talents.forEach((t, tj) => {
        console.log(`        {`);
        console.log(`          row: ${t.row},`);
        console.log(`          col: ${t.col},`);
        console.log(`          icon: '${t.icon}',`);
        console.log(`          name: '${t.name.replace(/'/g, "\\'")}',`);
        console.log(`          maxRank: ${t.maxRank},`);
        console.log(`          desc: '${t.desc.replace(/'/g, "\\'").replace(/\n/g, '\\n')}',`);
        if (t.prereq) {
          console.log(`          prereq: { row: ${t.prereq.row}, col: ${t.prereq.col} },`);
        }
        if (t.cost) {
          console.log(`          cost: '${t.cost.replace(/'/g, "\\'")}',`);
        }
        if (t.spec) {
          console.log(`          spec: true,`);
        }
        console.log(`        }${tj < tree.talents.length - 1 ? ',' : ''}`);
      });
      console.log(`        ]`);
      console.log(`      }${ti < treeKeys.length - 1 ? ',' : ''}`);
    });
    console.log(`    }`);
    console.log(`  }${ci < classKeys.length - 1 ? ',' : ''}`);
  });
  console.log('};');
}

// Fetch and convert
fetch('https://talentsforever.com/data.json')
  .then(res => res.json())
  .then(data => convert(data))
  .catch(err => {
    console.error('// Erro ao buscar data.json:', err.message);
    console.error('// Tente baixar manualmente e passar como argumento.');
  });
