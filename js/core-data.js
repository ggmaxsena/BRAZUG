/* ============================================================
   BRAZUG CORE FACTORY — Dados dos COREs
   ============================================================
   Para adicionar um novo CORE, basta inserir um objeto neste array.
   As páginas são geradas automaticamente a partir destes dados.
   ============================================================ */

const VELHO_QUESTIONS = [
  { id: 'nick', type: 'text', label: 'Qual teu nick no WoW?', required: true, hint: 'Discord precisa estar o mesmo nick.' },
  { id: 'play_mode', type: 'radio', label: 'Pretende jogar o HC ou apenas o PVP?', required: true, options: ['Sim, vou jogar o HC', 'Não, apenas o PVP'] },
  { id: 'days', type: 'checkbox', label: 'Quais são seus dias da semana disponíveis para raidar?', required: true, hint: 'lembrando, reservar 2hs', options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] },
  { id: 'times', type: 'radio', label: 'Quais os melhores horários para raid?', required: true, options: ['20:00h - 22:00h', '21:00h - 23:00h', '22:00h - 00:00h'] },
  { id: 'role', type: 'radio', label: 'Qual função pretende exercer?', required: true, options: ['Tank', 'Healer', 'DPS'] },
  { id: 'class', type: 'text', label: 'Qual classe pretende criar?', required: true },
  { id: 'leader', type: 'radio', label: 'Tem interesse em ser raid leader de core 10-man?', required: true, options: ['Sim', 'Não'] }
];

const BRAZUG_CORES = [
  {
    id: 'velho',
    name: 'CORE do Velho',
    subtitle: 'Veteranos da BRAZUG — Liderança, estratégia e mentoria no Classic HC',
    badge: '👴 CORE Sênior — Ativo',
    badgeClass: 'active',
    accent: '#c41e3a',          // Vermelho Horda
    accentGlow: 'rgba(196, 30, 58, 0.4)',
    gold: '#f7c14d',
    status: 'active',
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd8SODLr6mrQjAeyBRpuowe6DaAHzMQVTC1lkZwEAyn0FzITA/viewform',
    description: 'O CORE do Velho é o grupo de veteranos da guilda BRAZUG. Liderado por Velho do WoW (Core Leader) e Fkeall (Raid Leader). Estrutura: 40 MAN com RL FKEALL, 2 grupos 20-MAN (GRUPO 1 - RL: FKEALL, GRUPO 2 - RL: STERFTES), 4 grupos 10-MAN (GRUPO 1 - RL: FKEALL, GRUPO 2 - RL: STERFTES, GRUPO 3 - RL A DEFINIR, GRUPO 4 - RL A DEFINIR).',
    features: [
      { icon: 'fa-crown', label: 'Core Leader', text: 'Velho do WoW' },
      { icon: 'fa-comments', label: 'Raid Leader', text: 'Fkeall' },
      { icon: 'fa-users', label: 'Estrutura 40 MAN', text: '1 raid de 40 pessoas com RL: FKEALL' },
      { icon: 'fa-layer-group', label: '2 Grupos 20-MAN', text: 'GRUPO 1 - RL: FKEALL | GRUPO 2 - RL: STERFTES' },
      { icon: 'fa-layer-group', label: '4 Grupos 10-MAN', text: 'GRUPO 1 - RL: FKEALL | GRUPO 2 - RL: STERFTES | GRUPO 3 - RL A DEFINIR | GRUPO 4 - RL A DEFINIR' },
      { icon: 'fa-user-graduate', label: 'Mentoria', text: 'Veteranos ajudam novos membros a entender mecânicas e sobrevivência no HC.' }
    ],
    requirement: 'Membro ativo da BRAZUG com histórico comprovado no Classic HC. Discord deve estar com o mesmo nick do WoW. Convite via liderança.',
    groups: [
      { id: 'velho-40', name: '40 MAN', size: 40, leaderName: 'Fkeall', description: 'Raid principal de 40 jogadores.' },
      { id: 'velho-20', name: '20 MAN', size: 20, leaderName: 'Fkeall / Sterftes', description: 'Dois grupos de 20 jogadores.' },
      { id: 'velho-10', name: '10 MAN', size: 10, leaderName: 'A definir', description: 'Quatro grupos de 10 jogadores.' }
    ],
    questions: VELHO_QUESTIONS
  },
  {
    id: 'velho-40',
    parentId: 'velho',
    hiddenFromHub: true,
    name: 'CORE do Velho — 40 MAN',
    subtitle: 'Raid principal de 40 jogadores do CORE do Velho',
    badge: '⚔️ 40 MAN — Ativo',
    badgeClass: 'active',
    accent: '#c41e3a',
    accentGlow: 'rgba(196, 30, 58, 0.4)',
    gold: '#f7c14d',
    status: 'active',
    registrationOpen: true,
    formUrl: null,
    leaderName: 'Fkeall',
    description: 'Raid principal do CORE do Velho, com 40 jogadores e foco em progressão, estratégia e consistência no Classic Hardcore.',
    features: [
      { icon: 'fa-users', label: 'Formato', text: '40 jogadores' },
      { icon: 'fa-comments', label: 'Raid Leader', text: 'Fkeall' },
      { icon: 'fa-calendar-days', label: 'Raid', text: 'Horário definido pela liderança' }
    ],
    requirement: 'Membro ativo da BRAZUG com histórico comprovado no Classic HC. Discord deve estar com o mesmo nick do WoW.',
    questions: VELHO_QUESTIONS
  },
  {
    id: 'velho-20',
    parentId: 'velho',
    hiddenFromHub: true,
    name: 'CORE do Velho — 20 MAN',
    subtitle: 'Grupos de 20 jogadores do CORE do Velho',
    badge: '⚔️ 20 MAN — Ativo',
    badgeClass: 'active',
    accent: '#c41e3a',
    accentGlow: 'rgba(196, 30, 58, 0.4)',
    gold: '#f7c14d',
    status: 'active',
    registrationOpen: true,
    formUrl: null,
    leaderName: 'Fkeall / Sterftes',
    description: 'Dois grupos de 20 jogadores do CORE do Velho, com raid leaders dedicados e foco em progressão consistente.',
    features: [
      { icon: 'fa-users', label: 'Formato', text: '2 grupos de 20 jogadores' },
      { icon: 'fa-comments', label: 'Raid Leaders', text: 'Fkeall e Sterftes' },
      { icon: 'fa-calendar-days', label: 'Raid', text: 'Horário definido pela liderança' }
    ],
    requirement: 'Membro ativo da BRAZUG com histórico comprovado no Classic HC. Discord deve estar com o mesmo nick do WoW.',
    questions: VELHO_QUESTIONS
  },
  {
    id: 'velho-10',
    parentId: 'velho',
    hiddenFromHub: true,
    name: 'CORE do Velho — 10 MAN',
    subtitle: 'Grupos de 10 jogadores do CORE do Velho',
    badge: '⚔️ 10 MAN — Ativo',
    badgeClass: 'active',
    accent: '#c41e3a',
    accentGlow: 'rgba(196, 30, 58, 0.4)',
    gold: '#f7c14d',
    status: 'active',
    registrationOpen: true,
    formUrl: null,
    leaderName: 'A definir',
    description: 'Quatro grupos de 10 jogadores do CORE do Velho, ideais para conteúdo menor, mentoria e progressão em grupo.',
    features: [
      { icon: 'fa-users', label: 'Formato', text: '4 grupos de 10 jogadores' },
      { icon: 'fa-comments', label: 'Raid Leaders', text: 'Fkeall, Sterftes e líderes a definir' },
      { icon: 'fa-calendar-days', label: 'Raid', text: 'Horário definido pela liderança' }
    ],
    requirement: 'Membro ativo da BRAZUG com histórico comprovado no Classic HC. Discord deve estar com o mesmo nick do WoW.',
    questions: VELHO_QUESTIONS
  },
  {
    id: 'pvp',
    name: 'CORE PVP',
    subtitle: 'Grupo focado em PVP e guerra mundial no WoW Classic Hardcore',
    badge: '🔒 CORE PVP — Inscrições Fechadas',
    badgeClass: 'active',
    accent: '#4f6b8a',          // Azul
    accentGlow: 'rgba(79, 107, 138, 0.4)',
    gold: '#a8c4d8',
    status: 'active',
    registrationOpen: false,
    formUrl: null,
    description: 'O CORE PVP é o grupo dedicado a confrontos entre facções, guerras mundo, BGs e arenas no Classic Hardcore.',
    features: [
      { icon: 'fa-crossed-swords', label: 'PVP Mundo', text: 'Confrontos entre facções no mundo aberto.' },
      { icon: 'fa-flag', label: 'BGs e Arenas', text: 'Organização de campos de batalha.' },
      { icon: 'fa-skull', label: 'Risco Permanente', text: 'Combate com risco permanente no HC.' }
    ],
    requirement: 'Membro ativo da BRAZUG. Discord deve estar com o mesmo nick do WoW.',
    questions: [
      { id: 'nick', type: 'text', label: 'Qual teu nick no WoW?', required: true, hint: 'Discord precisa estar o mesmo nick.' },
      { id: 'play_mode', type: 'radio', label: 'Pretende jogar o HC ou apenas o PVP?', required: true, options: ['Sim, vou jogar o HC', 'Não, apenas o PVP'] },
      { id: 'days', type: 'checkbox', label: 'Quais são seus dias da semana disponíveis para jogar?', required: true, options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] },
      { id: 'times', type: 'radio', label: 'Quais os melhores horários para jogar?', required: true, options: ['20:00h - 22:00h', '21:00h - 23:00h', '22:00h - 00:00h'] },
      { id: 'role', type: 'radio', label: 'Qual função pretende exercer?', required: true, options: ['Tank', 'Healer', 'DPS'] },
      { id: 'class', type: 'text', label: 'Qual classe pretende criar?', required: true },
      { id: 'leader', type: 'radio', label: 'Tem interesse em ser líder de grupo?', required: true, options: ['Sim', 'Não'] }
    ]
  },
  {
    id: 'liga-sombras',
    name: 'CORE Liga das Sombras',
    subtitle: 'Grupo especializado em classes das sombras e furtividade',
    badge: '🌑 EM BREVE',
    badgeClass: 'soon',
    accent: '#8787ed',          // Roxo
    accentGlow: 'rgba(135, 135, 237, 0.4)',
    gold: '#a8c4d8',
    status: 'soon',
    formUrl: null,
    description: 'O CORE Liga das Sombras reunirá Ladinos, Bruxos e outras classes focadas em furtividade, controle e dano oculto.',
    features: [
      { icon: 'fa-user-ninja', label: 'Furtividade', text: 'Classes de sombras e disfarce.' },
      { icon: 'fa-mask', label: 'Controle', text: 'Controle de multidões e emboscadas.' },
      { icon: 'fa-bat', label: 'Dano Oculto', text: 'Maldições e dano sobre tempo.' }
    ],
    requirement: null
  },
  {
    id: 'tahaskk',
    name: 'CORE TAHASKK',
    subtitle: 'Grupo dedicado a classes de fogo e destruição',
    badge: '🔥 EM BREVE',
    badgeClass: 'soon',
    accent: '#ff7d0a',          // Fogo/Laranja
    accentGlow: 'rgba(255, 125, 10, 0.4)',
    gold: '#f7c14d',
    status: 'soon',
    formUrl: null,
    description: 'O CORE TAHASKK será dedicado a classes de fogo, destruição e dano explosivo para queimar os inimigos da Horda.',
    features: [
      { icon: 'fa-fire', label: 'Fogo e Destruição', text: 'Classes de dano explosivo.' },
      { icon: 'fa-bomb', label: 'Dano Explosivo', text: 'AOE e dano em área.' },
      { icon: 'fa-dragon', label: 'Poder Destrutivo', text: 'Raids e masmorras com fogo.' }
    ],
    requirement: null
  }
];

// Export para uso global
window.BRAZUG_CORES = BRAZUG_CORES;
