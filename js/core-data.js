/* ============================================================
   BRAZUG CORE FACTORY — Dados dos COREs
   ============================================================
   Para adicionar um novo CORE, basta inserir um objeto neste array.
   As páginas são geradas automaticamente a partir destes dados.
   ============================================================ */

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
    requirement: 'Membro ativo da BRAZUG com histórico comprovado no Classic HC. Discord deve estar com o mesmo nick do WoW. Convite via liderança.'
  },
  {
    id: 'pvp',
    name: 'CORE PVP',
    subtitle: 'Grupo focado em PVP e guerra mundial no WoW Classic Hardcore',
    badge: '🔱 EM BREVE',
    badgeClass: 'soon',
    accent: '#4f6b8a',          // Azul
    accentGlow: 'rgba(79, 107, 138, 0.4)',
    gold: '#a8c4d8',
    status: 'soon',
    formUrl: null,
    description: 'O CORE PVP será o grupo dedicado a confrontos entre facções, guerras mundo, BGs e arenas no Classic Hardcore.',
    features: [
      { icon: 'fa-crossed-swords', label: 'PVP Mundo', text: 'Confrontos entre facções no mundo aberto.' },
      { icon: 'fa-flag', label: 'BGs e Arenas', text: 'Organização de campos de batalha.' },
      { icon: 'fa-skull', label: 'Risco Permanente', text: 'Combate com risco permanente no HC.' }
    ],
    requirement: null
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