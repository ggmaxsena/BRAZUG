(function (root) {
  "use strict";

  const ArmoryController = {
    _currentCharData: null,
    _plannerItems: {},
    _tpState: {},
    _ttCache: {},
    _activeSearchSlot: null,

    MAX_TP_PTS: 51,
    SETS_KEY: 'brazug_char_sets',
    TP_BUILDS_KEY: 'brazug_tp_builds',

    rarityColors: {
      'POOR': '#9d9d9d', 'COMMON': '#ffffff', 'UNCOMMON': '#1eff00',
      'RARE': '#0070dd', 'EPIC': '#a335ee', 'LEGENDARY': '#ff8000',
      'ARTIFACT': '#e6cc80', 'HEIRLOOM': '#00ccff'
    },

    slotNames: {
      'HEAD': 'Cabeça', 'NECK': 'Pescoço', 'SHOULDER': 'Ombros', 'SHIRT': 'Camisa', 'CHEST': 'Torso', 'WAIST': 'Cintura',
      'LEGS': 'Pernas', 'FEET': 'Pés', 'WRIST': 'Pulsos', 'HANDS': 'Mãos', 'FINGER_1': 'Anel 1', 'FINGER_2': 'Anel 2',
      'TRINKET_1': 'Berloque 1', 'TRINKET_2': 'Berloque 2', 'BACK': 'Costas', 'MAIN_HAND': 'Mão Princ.', 'OFF_HAND': 'Mão Sec.',
      'RANGED': 'À Distância', 'TABARD': 'Tabardo'
    },

    slots: [
      'HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'SHIRT', 'TABARD', 'WRIST',
      'HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2',
      'MAIN_HAND', 'OFF_HAND', 'RANGED'
    ],

    async init() {
      const pathParts = window.location.pathname.split('/').filter(p => p !== "");
      const name = pathParts[pathParts.length - 1];
      const realm = pathParts[pathParts.length - 2] || 'doomhowl';

      this._realm = realm;
      this._name = name;

      await this.loadData();

      // Event listeners for global UI elements
      document.getElementById('set-name-input')?.addEventListener('keydown', e => {
          if (e.key === 'Enter') this.saveCurrentSet();
      });

      document.addEventListener('mousemove', (e) => {
          const tt = document.getElementById('brazug-tooltip');
          if (tt && tt.style.display === 'block') this.updateTTPosition(e);
      });
    },

    async loadData(attempt = 0) {
      try {
        const data = await ArmoryModel.fetchFullCharacter(this._realm, this._name);

        if (data && data.retry) {
          if (attempt < 5) {
            setTimeout(() => this.loadData(attempt + 1), 3000);
            return;
          } else {
            throw new Error("O servidor de sincronização está demorando mais que o esperado. Por favor, tente recarregar a página em instantes.");
          }
        }

        if (!data || !data.name) {
          throw new Error("Dados do personagem não encontrados.");
        }

        this._currentCharData = data;
        this.renderAll();
        this.initPlanner();
        this.initTP();
        this.updateSetsBadge();
      } catch (e) {
        const loadingEl = document.getElementById('armory-loading');
        const errorEl = document.getElementById('armory-error');
        const errorMsgEl = errorEl?.querySelector('p');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.style.display = 'block';
          if (errorMsgEl) errorMsgEl.innerText = e.message;
        }
        console.error("Failed to load character data:", e);
      }
    },

    normalizeClass(className) {
      if (!className) return 'warrior';
      const c = className.toLowerCase();
      if (c.includes('guerreiro') || c.includes('warrior')) return 'warrior';
      if (c.includes('caçador') || c.includes('hunter')) return 'hunter';
      if (c.includes('mago') || c.includes('mage')) return 'mage';
      if (c.includes('ladino') || c.includes('rogue')) return 'rogue';
      if (c.includes('sacerdote') || c.includes('priest')) return 'priest';
      if (c.includes('bruxo') || c.includes('warlock')) return 'warlock';
      if (c.includes('paladino') || c.includes('paladin')) return 'paladin';
      if (c.includes('xamã') || c.includes('shaman')) return 'shaman';
      if (c.includes('druida') || c.includes('druid')) return 'druid';
      return 'warrior';
    },

    getSpecializationGroups() {
      if (!this._currentCharData) return [];
      const extra = this._currentCharData.extra_data || this._currentCharData.extraData || {};
      const specs = extra.specializations || this._currentCharData.specializations;
      const charClass = this.normalizeClass(this._currentCharData.class);

      const CLASS_SPECS = {
        'warrior': ['Armas', 'Fúria', 'Proteção'],
        'paladin': ['Sagrado', 'Proteção', 'Retribuição'],
        'hunter': ['Domínio das Feras', 'Precisão', 'Sobrevivência'],
        'rogue': ['Assassinato', 'Combate', 'Subterfúgio'],
        'priest': ['Disciplina', 'Sagrado', 'Sombra'],
        'shaman': ['Elemental', 'Aperfeiçoamento', 'Restauração'],
        'mage': ['Arcano', 'Fogo', 'Gelo'],
        'warlock': ['Suplício', 'Demonologia', 'Destruição'],
        'druid': ['Equilíbrio', 'Feral', 'Restauração']
      };

      console.log("[BRAZUG-DEBUG] Raw Specs Data:", specs);

      let allFoundSpecs = [];

      if (specs) {
          if (Array.isArray(specs)) {
              allFoundSpecs = specs;
          } else if (specs.specialization_groups && Array.isArray(specs.specialization_groups)) {
              const activeGroup = specs.specialization_groups.find(g => g.is_active) || specs.specialization_groups[0];
              allFoundSpecs = activeGroup.specializations || [];
          } else if (specs.specializations && Array.isArray(specs.specializations)) {
              allFoundSpecs = specs.specializations;
          }
      }

      // If still empty, use map to create skeletons
      if (allFoundSpecs.length === 0 && charClass) {
          const names = CLASS_SPECS[charClass] || [];
          allFoundSpecs = names.map(n => ({ specialization_name: n, spent_points: 0, talents: [] }));
      }

      if (allFoundSpecs.length > 0) {
          return [{ specializations: allFoundSpecs }];
      }

      return [];
    },

    getTPBuilds() {
      try { return JSON.parse(localStorage.getItem(this.TP_BUILDS_KEY) || '[]'); } catch { return []; }
    },

    saveTPBuilds(builds) {
      localStorage.setItem(this.TP_BUILDS_KEY, JSON.stringify(builds));
    },

    renderAll() {
      document.getElementById('armory-loading').style.display = 'none';
      document.getElementById('armory-content').style.display = 'block';

      const saveBtn = document.getElementById('sets-save-btn');
      if (saveBtn) saveBtn.disabled = false;

      const role = localStorage.getItem("brazug_admin_role");
      const char = this._currentCharData;
      const charClass = this.normalizeClass(char.class);

      ArmoryView.renderHeader(char, role);
      ArmoryView.renderGear('gear-grid', char.items, this.slots, this.slotNames, this.rarityColors, char.avatarUrl);
      ArmoryView.renderStats('stats-container', char.extra_data?.statistics || {});
      ArmoryView.renderTalents('talents-container', this.getSpecializationGroups(), charClass);
      ArmoryView.renderProfessions('professions-container', char.professions || []);

      // Apply class-specific border to main panels
      document.querySelectorAll('.panel').forEach(p => p.classList.add(`class-${charClass}`));

      // Ensure initial tab state is correct
      this.switchTab('geral');

      if (window.$WowheadPower) window.$WowheadPower.refreshLinks();
    },

    switchTab(tabId) {
      // Set active button
      document.querySelectorAll('.armory-tab-btn').forEach(btn => {
          const btnOnclick = btn.getAttribute('onclick') || '';
          btn.classList.toggle('active', btnOnclick.includes(`'${tabId}'`));
      });

      // Set active content
      document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
          // Important: also ensure display is handled if CSS .active is not enough
          content.style.display = 'none';
      });

      const activeTab = document.getElementById(`tab-${tabId}`);
      if (activeTab) {
          activeTab.classList.add('active');
          activeTab.style.display = activeTab.classList.contains('armory-grid') ? 'grid' : 'block';
          // Planner and Min-Max might need specific display types
          if (tabId === 'min-max' || tabId === 'planner') {
              activeTab.style.display = 'grid';
          }
      }

      // Handle Sets FAB visibility
      const setsFab = document.querySelector('.sets-fab');
      const setsPanel = document.getElementById('sets-panel');
      if (setsFab) {
        setsFab.style.display = (tabId === 'min-max') ? 'block' : 'none';
      }
      if (setsPanel && tabId !== 'min-max') {
        setsPanel.classList.remove('open');
      }
    },

    // ===================== PLANNER (MIN-MAX) =====================
    initPlanner() {
      this._plannerItems = {};
      this._currentCharData.items.forEach(item => {
        this._plannerItems[item.slot] = {
          itemId: item.item_id || item.itemId,
          name: item.item_name || item.name,
          quality: item.item_quality || item.quality,
          icon: item.item_icon || item.icon,
          slot: item.slot,
          tooltipData: item.tooltip_data || item.tooltipData
        };
      });
      this.renderPlanner();
    },

    renderPlanner() {
      const char = this._currentCharData;
      ArmoryView.renderPlannerGrid('planner-slot-grid', this._plannerItems, this.slots, this.slotNames, this.rarityColors, char.avatarUrl);
      this.recalcPlannerStats();
    },

    recalcPlannerStats() {
      if (!this._currentCharData) return;

      const baseStats = this._currentCharData.extra_data?.statistics || {};
      const simulated = {
          health: baseStats.health || 0,
          power: baseStats.power || 0,
          strength: baseStats.strength?.effective || baseStats.strength || 0,
          agility: baseStats.agility?.effective || baseStats.agility || 0,
          intellect: baseStats.intellect?.effective || baseStats.intellect || 0,
          stamina: baseStats.stamina?.effective || baseStats.stamina || 0
      };

      // Subtract stats from CURRENT equipment
      this._currentCharData.items.forEach(origItem => {
          const data = origItem.tooltip_data || origItem.tooltipData;
          if (data?.stats) {
              data.stats.forEach(s => {
                  const val = s.value;
                  const type = s.type?.type;
                  if (type === 'STAMINA') simulated.stamina -= val;
                  if (type === 'STRENGTH') simulated.strength -= val;
                  if (type === 'AGILITY') simulated.agility -= val;
                  if (type === 'INTELLECT') simulated.intellect -= val;
              });
          }
      });

      // Add stats from PLANNED equipment
      Object.values(this._plannerItems).forEach(simItem => {
          const data = simItem.tooltipData || simItem.tooltip_data;
          if (data?.stats) {
              data.stats.forEach(s => {
                  const val = s.value;
                  const type = s.type?.type;
                  if (type === 'STAMINA') simulated.stamina += val;
                  if (type === 'STRENGTH') simulated.strength += val;
                  if (type === 'AGILITY') simulated.agility += val;
                  if (type === 'INTELLECT') simulated.intellect += val;
              });
          }
      });

      const staminaDiff = simulated.stamina - (baseStats.stamina?.effective || baseStats.stamina || 0);
      simulated.health += (staminaDiff * 10);

      ArmoryView.renderStats('planner-stats-container', simulated);
    },

    openSearch(slot) {
      this._activeSearchSlot = slot;
      document.getElementById('search-title').textContent = `Buscar: ${this.slotNames[slot]}`;
      
      const defaultSidebar = document.getElementById('minmax-default-sidebar');
      const searchSidebar = document.getElementById('minmax-search-sidebar');
      
      if (defaultSidebar) defaultSidebar.style.display = 'none';
      if (searchSidebar) searchSidebar.style.display = 'block';
      
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      
      const resultsEl = document.getElementById('search-results');
      if (resultsEl) resultsEl.innerHTML = '<div style="text-align: center; color: #444; padding: 20px;">Digite um nome e busque.</div>';
    },

    closeSearch() {
      const defaultSidebar = document.getElementById('minmax-default-sidebar');
      const searchSidebar = document.getElementById('minmax-search-sidebar');
      
      if (defaultSidebar) defaultSidebar.style.display = 'block';
      if (searchSidebar) searchSidebar.style.display = 'none';
    },

    async doSearch() {
      const q = document.getElementById('search-input').value;
      if (!q) return;

      const resultsEl = document.getElementById('search-results');
      resultsEl.innerHTML = '<div style="text-align:center; padding:40px;">⏳ Buscando...</div>';

      try {
          const items = await ArmoryModel.searchItems(q, this._activeSearchSlot);
          ArmoryView.renderSearchResults('search-results', items, this.rarityColors);
      } catch (e) {
          resultsEl.innerHTML = '<div style="text-align:center; padding:40px; color:var(--horde-red);">Erro ao buscar itens.</div>';
      }
    },

    async selectItem(itemId) {
      try {
          const item = await ArmoryModel.getItemDetails(itemId);

          this._plannerItems[this._activeSearchSlot] = {
              itemId: item.id,
              name: item.name,
              quality: item.quality,
              icon: item.icon,
              slot: this._activeSearchSlot,
              tooltipData: item.tooltip_data
          };

          this.renderPlanner();
          this.closeSearch();
      } catch (e) {
          alert("Erro ao selecionar item.");
      }
    },

    clearSlot(slot) {
      delete this._plannerItems[slot];
      this.renderPlanner();
    },

    resetPlannerToCurrent() {
      this.initPlanner();
    },

    clearPlanner() {
      this._plannerItems = {};
      this.renderPlanner();
    },

    // ===================== TALENT PLANNER (NEW ENGINE) =====================
    initTP() {
      if (!this._currentCharData) return;

      const charClass = this.normalizeClass(this._currentCharData.class);
      const classData = TALENT_TREES_DATA[charClass];

      if (!classData) {
        console.error(`[ArmoryController] No talent data for class: ${charClass}`);
        return;
      }

      // Initialize TalentTreeEngine
      const container = document.getElementById('tp-trees-container');
      if (!container) return;

      const success = TalentTreeEngine.init(charClass, classData.trees, '#tp-trees-container', this.renderTP.bind(this));
      if (!success) return;

      // Load current talent distribution from character data
      const extraData = this._currentCharData.extra_data || this._currentCharData.extraData || {};
      const specs = extraData.specializations || this._currentCharData.specializations;

      if (specs && Array.isArray(specs)) {
        Object.keys(classData.trees).forEach(treeKey => {
          const tree = classData.trees[treeKey];
          // Initialize from character spec data if available
          const spec = specs.find(s => {
            const sName = (s.specialization_name || "").toLowerCase();
            const tk = treeKey.toLowerCase();
            const label = (tree.label || "").toLowerCase();
            return sName.includes(tk) || tk.includes(sName) || sName.includes(label) || label.includes(sName);
          });

          if (spec && spec.talents) {
            // Map character talents to tree structure
            tree.talents.forEach(talent => {
              const charTalent = spec.talents.find(t => t.talent?.name === talent.name);
              if (charTalent && charTalent.talent_rank) {
                talent.rank = Math.min(charTalent.talent_rank, talent.maxRank);
              }
            });
          }
        });
      }

      this.renderTP();
    },

    renderTP() {
      if (!TalentTreeEngine.container) return;

      const totalPts = TalentTreeEngine.getTotalPoints();
      const ptsEl = document.getElementById('tp-total-pts');
      const barEl = document.getElementById('tp-pts-bar');

      if (ptsEl) ptsEl.textContent = totalPts;
      if (barEl) {
          const pct = (totalPts / this.MAX_TP_PTS) * 100;
          barEl.style.width = pct + '%';
      }
    },

    resetTPToCurrent() {
      this.initTP();
      this.renderTP();
    },

    clearTP() {
      if (TalentTreeEngine) {
        TalentTreeEngine.reset();
      }
      this.renderTP();
    },

    saveTPBuild() {
      const name = document.getElementById('tp-build-name').value.trim();
      if (!name) return alert("Dê um nome para a build.");
      if (!this._currentCharData) return alert("Nenhum personagem carregado.");

      const charClass = this.normalizeClass(this._currentCharData.class);
      const distribution = TalentTreeEngine.exportToCharacter();

      const build = {
        id: Date.now(),
        name,
        savedAt: new Date().toISOString(),
        character: {
          name: this._currentCharData.name,
          realm: this._realm,
          class: this._currentCharData.class,
          level: this._currentCharData.level
        },
        classType: charClass,
        distribution: distribution,
        totalPoints: TalentTreeEngine.getTotalPoints()
      };

      const builds = this.getTPBuilds();
      builds.unshift(build);
      this.saveTPBuilds(builds);
      document.getElementById('tp-build-name').value = '';
      alert(`Build "${name}" salva com sucesso!`);
    },

    // ===================== TOOLTIPS =====================
    async handleMouseEnter(e, id, type = 'item') {
      if (!id) return;

      const tt = document.getElementById('brazug-tooltip');
      tt.style.display = 'block';
      tt.innerHTML = '<div style="color:#666;">Carregando...</div>';
      this.updateTTPosition(e);

      if (type === 'item') {
          let item = this._ttCache[id];
          if (!item) {
              try {
                  item = await ArmoryModel.getItemDetails(id);
                  this._ttCache[id] = item;
              } catch (err) {
                  tt.innerHTML = '<div style="color:red;">Erro ao carregar tooltip.</div>';
                  return;
              }
          }
          ArmoryView.renderTooltip('brazug-tooltip', item, this.rarityColors);
      } else if (type === 'spell') {
          const spellData = this.findSpellData(id);
          if (spellData) {
              ArmoryView.renderSpellTooltip('brazug-tooltip', spellData);
          } else {
              tt.innerHTML = '<div style="color:red;">Magia não encontrada.</div>';
          }
      }
    },

    findSpellData(spellId) {
        if (!this._currentCharData || !spellId) return null;
        const groups = this.getSpecializationGroups();
        for (const g of groups) {
            for (const s of g.specializations) {
                const t = (s.talents || []).find(tal => tal.spell_tooltip?.spell?.id === spellId);
                if (t) return t.spell_tooltip;
            }
        }
        return null;
    },

    handleMouseLeave() {
      const tt = document.getElementById('brazug-tooltip');
      if (tt) tt.style.display = 'none';
    },

    updateTTPosition(e) {
      const tt = document.getElementById('brazug-tooltip');
      const x = e.clientX + 20;
      const y = e.clientY + 20;
      tt.style.left = x + 'px';
      tt.style.top = y + 'px';
    },

    // ===================== SETS SYSTEM =====================
    getSets() {
      try { return JSON.parse(localStorage.getItem(this.SETS_KEY) || '[]'); } catch { return []; }
    },

    saveSets(sets) {
      localStorage.setItem(this.SETS_KEY, JSON.stringify(sets));
    },

    updateSetsBadge() {
      const sets = this.getSets();
      const badge = document.getElementById('sets-count-badge');
      if (sets.length > 0) {
          badge.textContent = sets.length;
          badge.style.display = 'flex';
      } else {
          badge.style.display = 'none';
      }
    },

    toggleSetsPanel() {
      const panel = document.getElementById('sets-panel');
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) this.renderSetsList();
    },

    saveCurrentSet() {
      const nameInput = document.getElementById('set-name-input');
      const name = nameInput.value.trim();
      if (!name || !this._currentCharData) return;

      const char = this._currentCharData;
      const stats = char.extra_data?.statistics || {};
      const groups = char.extra_data?.specializations?.specialization_groups || [];
      const talents = groups.flatMap(g => g.specializations).map(s => ({
          name: s.specialization_name,
          pts: s.talents?.reduce((acc, t) => acc + (t.talent_rank || 0), 0) || 0
      }));

      const set = {
          id: Date.now(),
          name,
          savedAt: new Date().toISOString(),
          char: {
              name: char.name,
              level: char.level,
              race: char.race,
              class: char.class,
              guild: char.guild,
              avatarUrl: char.avatarUrl
          },
          stats: {
              health: stats.health,
              power: stats.power,
              strength: stats.strength?.effective,
              agility: stats.agility?.effective,
              intellect: stats.intellect?.effective,
              stamina: stats.stamina?.effective,
          },
          talents,
          gear: (char.items || []).map(i => ({
              slot: i.slot,
              name: i.item_name || i.name,
              quality: i.item_quality || i.quality,
              icon: i.item_icon || i.icon,
              itemId: i.item_id || i.itemId
          }))
      };

      const sets = this.getSets();
      sets.unshift(set);
      this.saveSets(sets);
      nameInput.value = '';
      this.updateSetsBadge();
      this.renderSetsList();

      const btn = document.getElementById('sets-save-btn');
      btn.textContent = '✓ Salvo!';
      btn.style.background = 'linear-gradient(135deg, #1a8a4a, #0d5a2e)';
      setTimeout(() => {
          btn.textContent = '+ Salvar';
          btn.style.background = '';
      }, 2000);
    },

    deleteSet(id) {
      const sets = this.getSets().filter(s => s.id !== id);
      this.saveSets(sets);
      this.updateSetsBadge();
      this.renderSetsList();
    },

    toggleSetCard(id) {
      const body = document.getElementById(`set-body-${id}`);
      if (body) body.classList.toggle('expanded');
    },

    renderSetsList() {
      const isActiveChar = this._currentCharData?.name;
      ArmoryView.renderSetsList('sets-list', this.getSets(), this.rarityColors, isActiveChar);
    },

    // ===================== ADMIN ACTIONS =====================
    async triggerAdminSync() {
      const btn = document.getElementById('admin-sync-btn');
      const originalText = btn.innerHTML;

      if (!confirm(`Deseja forçar a sincronização de ${this._name} com a Blizzard?`)) return;

      try {
          btn.disabled = true;
          btn.innerHTML = "⏳ Sincronizando...";

          const token = localStorage.getItem("brazug_admin_token");
          await ArmoryModel.triggerSync(this._realm, this._name, token);

          alert("Sincronização concluída com sucesso!");
          location.reload();
      } catch (e) {
          alert("Falha na sincronização: " + e.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
      }
    }
  };

  root.ArmoryController = ArmoryController;
  document.addEventListener("DOMContentLoaded", () => {
    ArmoryController.init();
  });
})(window);
