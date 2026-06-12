/**
 * TalentTreeEngine - Generic Talent Tree System for WoW Classes
 * Extracted and modularized from warrior_talents_v2.html
 * Compatible with armory-ficha.html integration
 */

(function (root) {
  "use strict";

  const TalentTreeEngine = {
    // Configuration
    MAX_PTS: 51,
    PTS_PER_TIER: 5,
    COLS: 4,
    ROWS: 9,
    CDN: 'https://wow.zamimg.com/images/wow/icons/medium',
    WOWHEAD: 'https://www.wowhead.com/classic/spell=',

    // Layout constants
    NODE_SIZE: 44,
    COL_GAP: 16,
    ROW_GAP: 28,
    COL_STEP: 60,    // NODE_SIZE + COL_GAP
    ROW_STEP: 72,    // NODE_SIZE + ROW_GAP
    PAD: 14,
    CANVAS_W: 242,   // (COLS * COL_STEP - COL_GAP + PAD*2)
    CANVAS_H: 634,   // (ROWS * ROW_STEP - ROW_GAP + PAD*2)

    // State
    trees: {},
    currentClass: null,
    container: null,
    onChange: null,

    /**
     * Initialize engine with class data and container
     */
    init(classKey, treeData, containerSelector, onChange) {
      this.currentClass = classKey;
      this.trees = treeData;
      this.container = document.querySelector(containerSelector);
      this.onChange = onChange;

      if (!this.container) {
        console.error(`[TalentTreeEngine] Container not found: ${containerSelector}`);
        return false;
      }

      this.buildTrees();
      this.renderAll();
      return true;
    },

    /**
     * Load talent distribution from API/character data
     */
    loadFromCharacter(specDistribution) {
      if (!specDistribution || typeof specDistribution !== 'object') return;

      Object.keys(this.trees).forEach(treeKey => {
        const treeData = this.trees[treeKey];
        const distribution = specDistribution[treeKey] || [];

        distribution.forEach((row, rowIdx) => {
          if (!Array.isArray(row)) return;
          row.forEach((rank, colIdx) => {
            const talent = this.getTalent(treeKey, rowIdx, colIdx);
            if (talent && rank > 0) {
              talent.rank = Math.min(rank, talent.maxRank);
            }
          });
        });
      });

      this.renderAll();
    },

    /**
     * Export current state as character distribution
     */
    exportToCharacter() {
      const result = {};
      Object.keys(this.trees).forEach(treeKey => {
        result[treeKey] = this._buildDistributionArray(treeKey);
      });
      return result;
    },

    _buildDistributionArray(treeKey) {
      const dist = [];
      for (let row = 0; row < this.ROWS; row++) {
        const rowData = [];
        for (let col = 0; col < this.COLS; col++) {
          const talent = this.getTalent(treeKey, row, col);
          rowData.push(talent ? talent.rank : null);
        }
        dist.push(rowData);
      }
      return dist;
    },

    /**
     * Get talent by tree, row, col
     */
    getTalent(treeKey, row, col) {
      if (!this.trees[treeKey]) return null;
      return this.trees[treeKey].talents.find(t => t.row === row && t.col === col) || null;
    },

    /**
     * Get total points in tree
     */
    getTreePoints(treeKey) {
      if (!this.trees[treeKey]) return 0;
      return this.trees[treeKey].talents.reduce((sum, t) => sum + (t.rank || 0), 0);
    },

    /**
     * Get total points across all trees
     */
    getTotalPoints() {
      return Object.keys(this.trees).reduce((sum, tk) => sum + this.getTreePoints(tk), 0);
    },

    /**
     * Check if tier is unlocked
     */
    tierUnlocked(treeKey, row) {
      const pts = this.getTreePoints(treeKey);
      return pts >= row * this.PTS_PER_TIER;
    },

    /**
     * Check if prerequisite is met
     */
    prereqMet(treeKey, talent) {
      if (!talent.prereq) return true;
      const prereq = this.getTalent(treeKey, talent.prereq.row, talent.prereq.col);
      return prereq && prereq.rank === prereq.maxRank;
    },

    /**
     * Check if can add point
     */
    canAdd(treeKey, talent) {
      if (this.getTotalPoints() >= this.MAX_PTS) return false;
      if (talent.rank >= talent.maxRank) return false;
      if (!this.tierUnlocked(treeKey, talent.row)) return false;
      if (!this.prereqMet(treeKey, talent)) return false;
      return true;
    },

    /**
     * Check if can remove point
     */
    canRemove(treeKey, talent) {
      if (talent.rank <= 0) return false;

      // Check if removing would break dependent talents
      const deps = this.trees[treeKey].talents.filter(t =>
        t.prereq && t.prereq.row === talent.row && t.prereq.col === talent.col && t.rank > 0
      );
      if (deps.length && talent.rank - 1 < talent.maxRank) return false;

      // Check if removing would lock a tier with invested points
      const newPts = this.getTreePoints(treeKey) - 1;
      const maxLockedRow = Math.floor(newPts / this.PTS_PER_TIER);
      const higherInvested = this.trees[treeKey].talents.some(t =>
        t.row > maxLockedRow && t.rank > 0 && !(t.row === talent.row && t.col === talent.col)
      );
      if (higherInvested) return false;

      return true;
    },

    /**
     * Add point to talent
     */
    addPoint(treeKey, talent) {
      if (!this.canAdd(treeKey, talent)) return false;
      talent.rank++;
      this.renderAll();
      if (this.onChange) this.onChange();
      return true;
    },

    /**
     * Remove point from talent
     */
    removePoint(treeKey, talent) {
      if (!this.canRemove(treeKey, talent)) return false;
      talent.rank--;
      this.renderAll();
      if (this.onChange) this.onChange();
      return true;
    },

    /**
     * Reset all talents
     */
    reset() {
      Object.keys(this.trees).forEach(treeKey => {
        this.trees[treeKey].talents.forEach(t => t.rank = 0);
      });
      this.renderAll();
      if (this.onChange) this.onChange();
    },

    /**
     * Get node state class
     */
    getNodeStateClass(treeKey, talent) {
      if (!this.tierUnlocked(treeKey, talent.row)) return 'locked';
      if (!this.prereqMet(treeKey, talent) && talent.rank === 0) return 'prereq-blocked';

      const baseState = talent.rank === 0 ? 'available' : talent.rank === talent.maxRank ? 'maxed' : 'partial';
      return talent.spec ? (talent.rank === talent.maxRank ? 'spec-talent maxed' : 'spec-talent ' + (talent.rank > 0 ? 'partial' : 'available')) : baseState;
    },

    /**
     * Build DOM trees
     */
    buildTrees() {
      if (!this.container) return;
      this.container.innerHTML = '';

      Object.keys(this.trees).forEach(treeKey => {
        const tree = this.trees[treeKey];
        const panel = document.createElement('div');
        panel.className = 'tt-tree';
        panel.id = `tt-tree-${treeKey}`;
        panel.innerHTML = `<div class="tt-corner tt-corner-tr"></div><div class="tt-corner tt-corner-bl"></div>`;

        // Label
        const label = document.createElement('div');
        label.className = 'tt-tree-label';
        label.innerHTML = `
          <div class="tt-tree-label-name">${tree.label}</div>
          <div class="tt-tree-label-pts">0</div>
          <div class="tt-tier-pip-row"></div>
        `;
        panel.appendChild(label);

        // Canvas
        const canvas = document.createElement('div');
        canvas.className = 'tt-tree-canvas';
        canvas.style.width = this.CANVAS_W + 'px';
        canvas.style.height = this.CANVAS_H + 'px';

        // SVG for arrows
        const svg = this._createArrowsSvg(treeKey);
        canvas.appendChild(svg);

        // Talent nodes
        tree.talents.forEach(talent => {
          const node = this._createTalentNode(treeKey, talent);
          canvas.appendChild(node);
        });

        // Tier dividers
        for (let row = 1; row < this.ROWS; row++) {
          const divider = document.createElement('div');
          divider.className = 'tt-tier-div';
          divider.setAttribute('data-row', row);
          divider.style.top = (row * this.ROW_STEP + this.PAD) + 'px';
          canvas.appendChild(divider);
        }

        panel.appendChild(canvas);
        this.container.appendChild(panel);
      });
    },

    /**
     * Create SVG with arrows
     */
    _createArrowsSvg(treeKey) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'tt-arrows-svg');
      svg.setAttribute('width', this.CANVAS_W);
      svg.setAttribute('height', this.CANVAS_H);
      svg.setAttribute('viewBox', `0 0 ${this.CANVAS_W} ${this.CANVAS_H}`);

      const tree = this.trees[treeKey];
      tree.talents.forEach(talent => {
        if (!talent.prereq) return;

        const from = this.getTalent(treeKey, talent.prereq.row, talent.prereq.col);
        if (!from) return;

        const x1 = this.PAD + from.col * this.COL_STEP + this.NODE_SIZE / 2;
        const y1 = this.PAD + from.row * this.ROW_STEP + this.NODE_SIZE / 2;
        const x2 = this.PAD + talent.col * this.COL_STEP + this.NODE_SIZE / 2;
        const y2 = this.PAD + talent.row * this.ROW_STEP + this.NODE_SIZE / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', `tt-arrow-${treeKey}-${talent.row}-${talent.col}`);
        path.setAttribute('class', 'tt-arrow-path');
        path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
        svg.appendChild(path);
      });

      return svg;
    },

    /**
     * Create talent node DOM
     */
    _createTalentNode(treeKey, talent) {
      const node = document.createElement('div');
      node.className = 'tt-node';
      node.id = `tt-node-${treeKey}-${talent.row}-${talent.col}`;
      node.style.left = (talent.col * this.COL_STEP) + 'px';
      node.style.top = (talent.row * this.ROW_STEP) + 'px';
      node.style.width = this.NODE_SIZE + 'px';
      node.style.height = this.NODE_SIZE + 'px';

      const frame = document.createElement('div');
      frame.className = 'tt-node-frame';
      frame.innerHTML = `
        <img src="${this.CDN}/${talent.icon}.jpg" alt="${talent.name}" loading="lazy">
        <div class="tt-node-rank">${talent.rank}/${talent.maxRank}</div>
      `;

      node.appendChild(frame);
      node.addEventListener('click', () => this.addPoint(treeKey, talent));
      node.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.removePoint(treeKey, talent);
      });
      node.addEventListener('mouseenter', (e) => this._showTooltip(e, treeKey, talent));
      node.addEventListener('mouseleave', () => this._hideTooltip());
      node.addEventListener('mousemove', (e) => this._moveTooltip(e));

      return node;
    },

    /**
     * Show tooltip
     */
    _showTooltip(e, treeKey, talent) {
      const hints = [];
      if (this.canAdd(treeKey, talent)) hints.push('Clique para adicionar ponto');
      else if (talent.rank === talent.maxRank) hints.push('Talento no máximo');
      else if (!this.tierUnlocked(treeKey, talent.row)) hints.push(`Requer ${talent.row * this.PTS_PER_TIER} pontos em ${this.trees[treeKey].label}`);
      else if (!this.prereqMet(treeKey, talent)) {
        const prereq = this.getTalent(treeKey, talent.prereq.row, talent.prereq.col);
        hints.push(`Requer ${prereq?.name || 'pré-requisito'} no máximo`);
      } else if (this.getTotalPoints() >= this.MAX_PTS) hints.push('Sem pontos restantes');
      if (this.canRemove(treeKey, talent)) hints.push('Clique-direito para remover');

      const tooltip = this._getOrCreateTooltip();
      tooltip.querySelector('.tt-tooltip-name').textContent = talent.name;
      tooltip.querySelector('.tt-tooltip-rank').textContent = `Rank ${talent.rank} / ${talent.maxRank}`;
      tooltip.querySelector('.tt-tooltip-desc').textContent = talent.desc || '';
      tooltip.querySelector('.tt-tooltip-hint').textContent = hints.join(' · ');

      tooltip.style.display = 'block';
      this._moveTooltip(e);
    },

    /**
     * Hide tooltip
     */
    _hideTooltip() {
      const tooltip = document.getElementById('tt-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    },

    /**
     * Move tooltip
     */
    _moveTooltip(e) {
      const tooltip = document.getElementById('tt-tooltip');
      if (!tooltip || tooltip.style.display === 'none') return;

      const margin = 12;
      let x = e.clientX + margin;
      let y = e.clientY + margin;
      const tw = tooltip.offsetWidth || 260;
      const th = tooltip.offsetHeight || 100;

      if (x + tw > window.innerWidth - 8) x = e.clientX - tw - margin;
      if (y + th > window.innerHeight - 8) y = e.clientY - th - margin;

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    },

    /**
     * Get or create tooltip element
     */
    _getOrCreateTooltip() {
      let tooltip = document.getElementById('tt-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'tt-tooltip';
        tooltip.className = 'tt-tooltip';
        tooltip.innerHTML = `
          <div class="tt-tooltip-name"></div>
          <div class="tt-tooltip-rank"></div>
          <div class="tt-tooltip-desc"></div>
          <div class="tt-tooltip-hint"></div>
        `;
        document.body.appendChild(tooltip);

        document.addEventListener('mousemove', (e) => {
          if (tooltip.style.display === 'block') this._moveTooltip(e);
        });
      }
      return tooltip;
    },

    /**
     * Render all trees
     */
    renderAll() {
      Object.keys(this.trees).forEach(treeKey => this._renderTree(treeKey));
    },

    /**
     * Render single tree
     */
    _renderTree(treeKey) {
      const panel = document.getElementById(`tt-tree-${treeKey}`);
      if (!panel) return;

      const pts = this.getTreePoints(treeKey);

      // Update label
      const ptsEl = panel.querySelector('.tt-tree-label-pts');
      ptsEl.textContent = pts;
      ptsEl.className = 'tt-tree-label-pts' + (pts > 0 ? ' has' : '');

      // Update tier pips
      const pipRow = panel.querySelector('.tt-tier-pip-row');
      pipRow.innerHTML = '';
      for (let tier = 0; tier < this.ROWS; tier++) {
        const needed = tier * this.PTS_PER_TIER;
        const pip = document.createElement('div');
        pip.className = 'tt-tier-pip';
        if (pts >= needed + this.PTS_PER_TIER) pip.classList.add('maxed');
        else if (pts >= needed) pip.classList.add('on');
        pipRow.appendChild(pip);
      }

      // Update nodes
      this.trees[treeKey].talents.forEach(talent => {
        const nodeEl = document.getElementById(`tt-node-${treeKey}-${talent.row}-${talent.col}`);
        if (!nodeEl) return;

        nodeEl.className = 'tt-node ' + this.getNodeStateClass(treeKey, talent);

        const rankEl = nodeEl.querySelector('.tt-node-rank');
        if (rankEl) {
          rankEl.textContent = `${talent.rank}/${talent.maxRank}`;
          rankEl.style.color = talent.rank === talent.maxRank ? 'var(--brazug-gold)' : 'var(--muted)';
        }
      });

      // Update arrows
      const svg = panel.querySelector('.tt-arrows-svg');
      if (svg) {
        this.trees[treeKey].talents.forEach(talent => {
          if (!talent.prereq) return;
          const prereq = this.getTalent(treeKey, talent.prereq.row, talent.prereq.col);
          const met = prereq && prereq.rank === prereq.maxRank;
          const path = svg.querySelector(`#tt-arrow-${treeKey}-${talent.row}-${talent.col}`);
          if (path) path.className.baseVal = 'tt-arrow-path' + (met ? ' prereq-met' : '');
        });
      }
    }
  };

  root.TalentTreeEngine = TalentTreeEngine;
})(window);
