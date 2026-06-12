# Sistema de Árvore de Talentos Genérico - TalentTreeEngine

## 📋 Visão Geral

O `TalentTreeEngine` é um sistema modular e reutilizável para gerenciar árvores de talentos em todas as classes de World of Warcraft Classic. Extraído e refatorado a partir do código do `warrior_talents_v2.html`, agora funciona como um motor genérico compatível com a integração na página `armory-ficha.html`.

## 🏗️ Arquivos do Sistema

### 1. **TalentTreeEngine.js** (`/js/`)

Motor principal que gerencia todas as operações de árvore de talentos.

**Métodos Principais:**

- `init(classKey, treeData, containerSelector)` - Inicializa o engine
- `loadFromCharacter(specDistribution)` - Carrega dados do personagem
- `exportToCharacter()` - Exporta estado atual
- `addPoint(treeKey, talent)` - Adiciona ponto a talento
- `removePoint(treeKey, talent)` - Remove ponto do talento
- `reset()` - Reseta todas as árvores
- `getTotalPoints()` - Retorna pontos gastos
- `getTreePoints(treeKey)` - Retorna pontos da árvore específica

**Características:**

- Validação automática de pré-requisitos
- Controle de limite de pontos (51 máximo)
- Verificação de desbloqueio de camadas (5 pontos por camada)
- Tooltips interativos nativos
- Sistema de setas SVG mostrando dependências

### 2. **talent-trees.js** (`/js/data/`)

Banco de dados com as árvores de talentos de todas as classes.

**Estrutura:**

```javascript
TALENT_TREES_DATA = {
  classKey: {
    label: 'Nome da Classe',
    trees: {
      treeKey: {
        label: 'Nome da Árvore',
        accent: '#cor_hex',
        bgIcon: 'icon_name',
        talents: [
          {
            row: 0, // Linha (0-8)
            col: 0, // Coluna (0-3)
            spellId: 12345, // ID do spell WoW
            icon: 'icon_path',
            name: 'Nome',
            maxRank: 5,
            rank: 0, // Pontos alocados
            desc: 'Descrição',
            spec: false, // true = talento de especialização (tier 9)
            prereq: { row: 1, col: 2 }, // Pré-requisito (opcional)
          },
          // ... mais talentos
        ],
      },
    },
  },
};
```

**Classes Implementadas:**

- ✅ Warrior (Guerreiro) - 3 trees (Arms, Fury, Protection)
- ✅ Paladin (Paladino) - 3 trees (Holy, Protection, Retribution)
- ✅ Hunter (Caçador) - 3 trees (Beast Mastery, Marksmanship, Survival)
- ✅ Rogue (Ladino) - 3 trees (Assassination, Combat, Subtlety)
- ⏳ Priest, Shaman, Mage, Warlock, Druid (estrutura base pronta para dados)

### 3. **talent-trees.css** (`/css/`)

Estilos modernos e responsivos integrados com o tema BRAZUG.

**Principais características:**

- Design WoW Classic fiel
- Temas por classe (cores automáticas)
- Animações para talentos especiais
- Responsivo para mobile
- Suporte a modo escuro

### 4. **ArmoryController.js** (modificado)

Integração com o controlador existente.

**Novos métodos:**

- `initTP()` - Inicializa o engine com dados do personagem
- `renderTP()` - Atualiza visualização
- `resetTPToCurrent()` - Volta para alocação atual
- `clearTP()` - Limpa todos os pontos
- `saveTPBuild()` - Salva build como JSON no localStorage

### 5. **armory-ficha.html** (modificado)

Integração visual na aba "Planner".

**Mudanças:**

- Aba "Planner (Simular Talentos)" simplificada
- Container `#tp-trees-container` para renderização
- Botões de ação (Reset, Clear, Save)
- Input para nomear build

## 🚀 Como Usar

### Inicialização Básica

```javascript
// No seu código JavaScript
const classKey = 'warrior'; // warrior, paladin, hunter, rogue, etc.
const treeData = TALENT_TREES_DATA[classKey].trees;

TalentTreeEngine.init(classKey, treeData, '#tp-trees-container');
```

### Carregar Dados de Personagem

```javascript
// Estrutura de distribuição (do API/banco de dados)
const characterDistribution = {
  arms: [
    [5, 0, 0, 0], // Tier 1 - 5 pontos em col 0
    [5, 0, 2, 0], // Tier 2 - 5 pontos em col 0, 2 em col 2
    // ... rest of tiers
  ],
  fury: [
    // ... similar structure
  ],
  protection: [
    // ... similar structure
  ],
};

TalentTreeEngine.loadFromCharacter(characterDistribution);
```

### Exportar Estado

```javascript
const exportedDistribution = TalentTreeEngine.exportToCharacter();
// Salvar no banco de dados ou localStorage
localStorage.setItem('characterTalents', JSON.stringify(exportedDistribution));
```

### Manipulação de Pontos

```javascript
// Adicionar ponto
const talent = TalentTreeEngine.getTalent('arms', 0, 0);
TalentTreeEngine.addPoint('arms', talent);

// Remover ponto
TalentTreeEngine.removePoint('arms', talent);

// Resetar tudo
TalentTreeEngine.reset();

// Consultar estado
console.log(TalentTreeEngine.getTotalPoints()); // 51
console.log(TalentTreeEngine.getTreePoints('arms')); // 17
```

## 📦 Integração com Armory

### Estrutura HTML Necessária

```html
<!-- Na aba do Planner -->
<div id="tp-trees-container" class="talent-trees-container">
  <!-- Renderizado automaticamente pelo engine -->
</div>

<!-- Tooltip (criado automaticamente, mas pode ser pré-definido) -->
<div id="tt-tooltip" class="tt-tooltip" style="display: none">
  <div class="tt-tooltip-name"></div>
  <div class="tt-tooltip-rank"></div>
  <div class="tt-tooltip-desc"></div>
  <div class="tt-tooltip-hint"></div>
</div>
```

### Integração com ArmoryController

```javascript
// No initTP()
const charClass = this.normalizeClass(this._currentCharData.class);
const classData = TALENT_TREES_DATA[charClass];
TalentTreeEngine.init(charClass, classData.trees, '#tp-trees-container');

// Carregar distribuição atual se disponível
const distribution = this._currentCharData.extra_data?.talent_distribution;
if (distribution) {
  TalentTreeEngine.loadFromCharacter(distribution);
}
```

## 🎨 Customização Visual

### Mudar Cores de Tema

```css
:root {
  --tt-bg: #0b0a07;
  --tt-panel: #14120d;
  --tt-border: #4a3a1a;
  --tt-gold: #f7c14d;
  --tt-text: #c8b580;
  /* ... more variables */
}
```

### Adicionar Nova Classe

1. **Adicionar em `talent-trees.js`:**

```javascript
TALENT_TREES_DATA.priest = {
  label: 'Sacerdote',
  trees: {
    discipline: {
      label: 'Disciplina',
      accent: '#7a7a7a',
      bgIcon: 'spell_holy_powerwordshield',
      talents: [
        // ... talent definitions
      ],
    },
    holy: {
      // ...
    },
    shadow: {
      // ...
    },
  },
};
```

2. **Adicionar suporte em `ArmoryController.normalizeClass()`:**

```javascript
if (c.includes('sacerdote') || c.includes('priest')) return 'priest';
```

## 📊 Estrutura de Dados Exportada

```json
{
  "arms": [
    [5, 0, 2, 0],
    [3, 5, 0, 0],
    [0, 1, 0, 0],
    ...
  ],
  "fury": [...],
  "protection": [...]
}
```

Cada sub-array é uma camada (0-8), cada número é o rank alocado (0 = sem ponto, null = célula vazia).

## 🎮 Controles de Usuário

| Ação                  | Resultado                       |
| --------------------- | ------------------------------- |
| Clique esquerdo no nó | Adiciona ponto (se possível)    |
| Clique direito no nó  | Remove ponto (se possível)      |
| Hover no nó           | Mostra tooltip com descrição    |
| Botão "Resetar"       | Volta para distribuição atual   |
| Botão "Limpar"        | Remove todos os pontos          |
| Botão "Salvar Build"  | Armazena estado em localStorage |

## 🔧 Debugging

```javascript
// Verificar estado do engine
console.log('Total pontos:', TalentTreeEngine.getTotalPoints());
console.log('Árvores:', TalentTreeEngine.trees);
console.log('Container:', TalentTreeEngine.container);

// Validar talento
const talent = TalentTreeEngine.getTalent('arms', 0, 0);
console.log('Pode adicionar?', TalentTreeEngine.canAdd('arms', talent));
console.log('Pode remover?', TalentTreeEngine.canRemove('arms', talent));

// Exportar estado
const exported = TalentTreeEngine.exportToCharacter();
console.log(JSON.stringify(exported, null, 2));
```

## 📱 Responsividade

- **Desktop (>1200px):** 3-4 árvores lado a lado
- **Tablet (768-1200px):** 2 árvores por linha
- **Mobile (<768px):** Stack vertical, interface tátil otimizada

## 🚨 Limitações Conhecidas

1. **Imagens de ícones:** Dependem da CDN do Wowhead (`wow.zamimg.com`)
2. **IDs de spells:** Devem corresponder com Wowhead Classic DB
3. **Localizador em tempo real:** Não sincroniza com servidor em tempo real (apenas ao salvar)
4. **Suporte a navegadores:** Requer ES6+ (IE não suportado)

## 📝 Notas de Manutenção

- Adicione talentos em ordem de linha/coluna
- Use `spec: true` apenas para o talento da tier 9 (40 pts)
- Sempre defina `prereq` quando um talento depender de outro
- Teste com múltiplas resoluções após mudanças CSS
- Valide IDs de ícones contra CDN Wowhead

## 🔗 Referências

- [WoW Classic Talent Calculator](https://classic.wowhead.com/talent-calc)
- [Wowhead API](https://classic.wowhead.com/docs)
- [Zamimg CDN Icons](https://wow.zamimg.com/images/wow/icons/medium/)

---

**Versão:** 1.0
**Criado:** 2026-06-11
**Manutentor:** BRAZUG Dev Team
