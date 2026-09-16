/**
 * DeathLog Frontend — BRAZUG
 * Arquitetura MVC Manual (padrão do projeto)
 * 
 * Model  → Fetch das rotas do backend Express (/api/deathmap/*)
 * View   → Manipulação de DOM, formatação e renderização
 * Ctrl   → DeathlogController orquestra os eventos e estado
 */

"use strict";

const API_BASE = "/api/brazug"; // Ajuste se o seu backend responder diretamente em /api

/* ═══════════════════════════════════════════════
   MODEL
═══════════════════════════════════════════════ */
const DeathlogModel = {
  async fetchGuild(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${API_BASE}/guild${qs ? "?" + qs : ""}`);
    if (!r.ok) throw new Error(`Guild API HTTP ${r.status}`);
    return r.json();
  },

  async fetchDeaths(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    const r = await fetch(`${API_BASE}/deaths${qs ? "?" + qs : ""}`);
    if (!r.ok) throw new Error(`Deaths API HTTP ${r.status}`);
    return r.json();
  },

  async fetchStreaks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${API_BASE}/streaks${qs ? "?" + qs : ""}`);
    if (!r.ok) throw new Error(`Streaks API HTTP ${r.status}`);
    return r.json();
  },

  async fetchDigest(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${API_BASE}/digest${qs ? "?" + qs : ""}`);
    if (!r.ok) throw new Error(`Digest API HTTP ${r.status}`);
    return r.json();
  },

  async fetchCardUrl(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${API_BASE}/card-url${qs ? "?" + qs : ""}`);
    if (!r.ok) throw new Error(`Card URL API HTTP ${r.status}`);
    return r.json();
  }
};

/* ═══════════════════════════════════════════════
   VIEW HELPERS
═══════════════════════════════════════════════ */
const DeathlogView = {
  CLASS_COLORS: {
    1: { name: "Warrior", color: "#C79C6E", icon: "⚔️" },
    2: { name: "Paladin", color: "#F58CBA", icon: "🛡️" },
    3: { name: "Hunter", color: "#ABD473", icon: "🏹" },
    4: { name: "Rogue", color: "#FFF569", icon: "🗡️" },
    5: { name: "Priest", color: "#FFFFFF", icon: "✨" },
    6: { name: "Death Knight", color: "#C41F3B", icon: "💀" },
    7: { name: "Shaman", color: "#0070DE", icon: "⚡" },
    8: { name: "Mage", color: "#40C7EB", icon: "🔮" },
    9: { name: "Warlock", color: "#8787ED", icon: "👁️" },
    11: { name: "Druid", color: "#FF7D0A", icon: "🌿" }
  },

  getClass(id) {
    return this.CLASS_COLORS[id] || { name: "Desconhecido", color: "#aaa", icon: "❓" };
  },

  formatTime(ts) {
    if (!ts) return "—";
    // Suporta timestamp unix em segundos ou millis
    const dateVal = ts < 10000000000 ? ts * 1000 : ts;
    const d = new Date(dateVal);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  },

  formatAlive(secs) {
    if (!secs) return null;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${secs}s`;
  },

  renderGuildHeader(data) {
    const el = document.getElementById("guild-header");
    if (!el || !data) return;

    const members = data.memberCount || data.member_count || "?";
    const totalDeaths = data.totalDeaths || data.deaths || data.total_deaths || "?";
    const avgLevel = data.avgLevel || data.avg_level || "?";

    el.innerHTML = `
      <div class="guild-stat">
        <span class="guild-stat-value">${members}</span>
        <span class="guild-stat-label">Membros</span>
      </div>
      <div class="guild-stat-divider"></div>
      <div class="guild-stat">
        <span class="guild-stat-value text-blood">${totalDeaths}</span>
        <span class="guild-stat-label">Mortes Totais</span>
      </div>
      <div class="guild-stat-divider"></div>
      <div class="guild-stat">
        <span class="guild-stat-value">${avgLevel}</span>
        <span class="guild-stat-label">Nível Médio</span>
      </div>
    `;
  },

  buildDeathRow(death, index) {
    const classId = death.classId || death.class_id;
    const cls = this.getClass(classId);

    // Mapeamento dos campos schema Deathmap API -> Fallbacks locais
    const aliveStr = this.formatAlive(death.played || death.timeAlive || death.time_alive);
    const zone = death.zone || death.zoneName || (death.mapId ? `Zona ID ${death.mapId}` : "Azeroth");
    const killer = death.sourceName || death.killedBy || death.killer || death.killed_by || "";
    const level = death.level || death.characterLevel || "?";
    const name = death.name || death.characterName || "Aventureiro";
    const timestamp = death.ts || death.timestamp || death.diedAt;
    const time = this.formatTime(timestamp);
    const lastWords = death.lastWords ? `"${death.lastWords}"` : null;

    const killerPill = killer
      ? `<span class="cause-tag cause-tag--killer" title="Morto por ${killer}">⚔ ${killer}</span>`
      : `<span class="cause-tag cause-tag--env">🌍 Ambiente / Desconhecido</span>`;

    const alivePill = aliveStr
      ? `<span class="alive-tag">⏱ ${aliveStr} /played</span>`
      : "";

    return `
      <div class="death-row" style="--row-delay: ${index * 60}ms" data-index="${index}">
        <div class="death-row-skull">☠</div>
        <div class="death-row-avatar" style="color: ${cls.color}">${cls.icon}</div>
        <div class="death-row-info">
          <div class="death-row-name-line">
            <span class="death-row-name" style="color: ${cls.color}">${name}</span>
            <span class="death-row-level">Nv. ${level}</span>
            <span class="death-row-class">${cls.name}</span>
          </div>
          <div class="death-row-meta">
            ${killerPill}
            <span class="zone-tag">📍 ${zone}</span>
            ${alivePill}
          </div>
          ${lastWords ? `<div class="death-row-words text-amber-200/80 italic text-xs mt-1">💬 ${lastWords}</div>` : ""}
        </div>
        <div class="death-row-time">${time}</div>
      </div>
    `;
  },

  renderDeaths(deaths, container) {
    if (!container) return;
    if (!deaths || deaths.length === 0) {
      container.innerHTML = `
        <div class="state-empty">
          <div class="state-empty-skull">☠</div>
          <p class="state-empty-title">Nenhuma morte registrada</p>
          <p class="state-empty-sub">Os heróis de BRAZUG ainda vivem... por enquanto.</p>
        </div>
      `;
      return;
    }
    container.innerHTML = deaths.map((d, i) => this.buildDeathRow(d, i)).join("");

    requestAnimationFrame(() => {
      container.querySelectorAll(".death-row").forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 60);
      });
    });
  },

  renderStreaks(data) {
    const el = document.getElementById("streaks-body");
    if (!el) return;

    // Suporta formato de Lista ou Objeto de estatísticas da rota /v1/streaks
    if (data && (data.deathsToday !== undefined || data.deaths24h !== undefined)) {
      const last = data.lastDeath || {};
      const cls = this.getClass(last.classId);
      el.innerHTML = `
        <div class="streaks-summary-grid">
          <div class="streak-card"><span class="val">${data.deathsToday ?? 0}</span><span class="lbl">Mortes Hoje</span></div>
          <div class="streak-card"><span class="val">${data.deaths24h ?? 0}</span><span class="lbl">Últimas 24h</span></div>
          <div class="streak-card"><span class="val">${data.deaths7d ?? 0}</span><span class="lbl">Últimos 7 dias</span></div>
        </div>
        ${last.name ? `
          <div class="last-death-box mt-3 p-2 bg-zinc-900 border border-red-900/40 rounded">
            <span class="text-xs text-zinc-400">Última Queda Registrada:</span>
            <div class="font-bold" style="color: ${cls.color}">${cls.icon} ${last.name} (Nv. ${last.level})</div>
          </div>
        ` : ""}
      `;
      return;
    }

    const list = data?.streaks || data?.data || [];
    if (!list.length) {
      el.innerHTML = `<p class="no-data">Sem streaks registrados</p>`;
      return;
    }

    el.innerHTML = list.map((s, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const cls = this.getClass(s.classId || s.class_id);
      return `
        <div class="streak-row">
          <span class="streak-pos">${medal}</span>
          <span class="streak-icon" style="color:${cls.color}">${cls.icon}</span>
          <span class="streak-name" style="color:${cls.color}">${s.name || s.characterName || "?"}</span>
          <span class="streak-count">${s.streak || s.count || 0} <small>sem morrer</small></span>
        </div>
      `;
    }).join("");
  },

  renderDigest(data) {
    const el = document.getElementById("digest-body");
    if (!el) return;
    const d = data?.digest || data?.data || data || {};
    el.innerHTML = `
      <div class="digest-grid">
        <div class="digest-item">
          <span class="digest-val text-blood">${d.deaths || d.totalDeaths || d.total_deaths || 0}</span>
          <span class="digest-lbl">Mortes no Período</span>
        </div>
        <div class="digest-item">
          <span class="digest-val">${d.previousWindowDeaths ?? "—"}</span>
          <span class="digest-lbl">Período Anterior</span>
        </div>
        <div class="digest-item">
          <span class="digest-val">${d.deadliestZone || d.deadliest_zone || "—"}</span>
          <span class="digest-lbl">Zona Mais Letal</span>
        </div>
        <div class="digest-item">
          <span class="digest-val">${d.deadliestKiller || d.most_common_killer || "—"}</span>
          <span class="digest-lbl">Assassino Favorito</span>
        </div>
      </div>
    `;
  },

  renderCard(cardUrl) {
    const el = document.getElementById("memorial-card");
    if (!el || !cardUrl) return;
    el.innerHTML = `
      <a href="${cardUrl}" target="_blank" rel="noopener" class="card-link">
        <img src="${cardUrl}" alt="Cartão Memorial BRAZUG" class="card-img" loading="lazy" />
        <div class="card-overlay">🔗 Ver em tamanho completo</div>
      </a>
    `;
  },

  showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="state-loading">
        <div class="skull-spin">☠</div>
        <p>Carregando dados da guilda...</p>
      </div>
    `;
  },

  showError(containerId, msg) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="state-error">
        <span class="state-error-icon">⚠</span>
        <p>${msg}</p>
      </div>
    `;
  },

  updateStatBadge(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
  },

  setTabActive(tabId) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.toggle("active", p.id === tabId));
  }
};

/* ═══════════════════════════════════════════════
   CONTROLLER
═══════════════════════════════════════════════ */
const DeathlogController = {
  state: {
    limit: 25,
    cursor: null,
    hasMore: false,
    loading: false,
    deaths: [],
    currentTab: "deaths",
    filters: {}
  },

  async init(opts = {}) {
    this.bindEvents();
    const isAdmin = localStorage.getItem("brazug_admin_role") === "admin";
    const forceRefresh = opts.forceRefresh && isAdmin;

    if (forceRefresh) {
        this.state.filters.forceRefresh = true;
    } else {
        delete this.state.filters.forceRefresh;
    }

    await Promise.allSettled([
      this.loadGuild({ forceRefresh }),
      this.loadDeaths(true),
      this.loadStreaks({ forceRefresh }),
      this.loadDigest({ forceRefresh }),
      this.loadCard()
    ]);
    DeathlogView.setTabActive("deaths");
  },

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.state.currentTab = tab;
        DeathlogView.setTabActive(tab);
      });
    });

    const applyBtn = document.getElementById("btn-apply-filters");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const minLevel = document.getElementById("filter-min-level")?.value;
        const maxLevel = document.getElementById("filter-max-level")?.value;
        const classId = document.getElementById("filter-class")?.value;
        this.state.filters = { ...this.state.filters, minLevel, maxLevel, classId };
        this.state.cursor = null;
        this.state.deaths = [];
        this.loadDeaths(true);
      });
    }

    const resetBtn = document.getElementById("btn-reset-filters");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const fr = this.state.filters.forceRefresh;
        this.state.filters = fr ? { forceRefresh: true } : {};
        this.state.cursor = null;
        this.state.deaths = [];
        ["filter-min-level", "filter-max-level", "filter-class"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        this.loadDeaths(true);
      });
    }

    const loadMoreBtn = document.getElementById("btn-load-more");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => this.loadDeaths(false));
    }

    const reloadBtn = document.getElementById("btn-reload");
    const autoBtn = document.getElementById("btn-auto-refresh");
    const isAdmin = localStorage.getItem("brazug_admin_role") === "admin";

    if (reloadBtn) {
      if (isAdmin) {
        reloadBtn.addEventListener("click", () => this.init({ forceRefresh: true }));
      } else {
        reloadBtn.style.display = "none";
      }
    }

    if (autoBtn) {
      if (isAdmin) {
        autoBtn.addEventListener("click", () => this.toggleAutoRefresh(autoBtn));
      } else {
        autoBtn.style.display = "none";
      }
    }

    const winSelect = document.getElementById("filter-window");
    if (winSelect) {
      winSelect.addEventListener("change", () => this.loadDigest({ forceRefresh: this.state.filters.forceRefresh }));
    }
  },

  _autoRefreshInterval: null,

  toggleAutoRefresh(btn) {
    if (this._autoRefreshInterval) {
      clearInterval(this._autoRefreshInterval);
      this._autoRefreshInterval = null;
      btn.classList.remove("active");
      btn.innerHTML = `<span class="btn-icon">🔄</span> Auto Refresh`;
    } else {
      this._autoRefreshInterval = setInterval(() => {
        this.state.filters.forceRefresh = true;
        this.state.cursor = null;
        this.state.deaths = [];
        this.loadDeaths(true);
      }, 30000);
      btn.classList.add("active");
      btn.innerHTML = `<span class="btn-icon">⏹</span> Parar Refresh`;
    }
  },

  async loadGuild(params = {}) {
    try {
      const data = await DeathlogModel.fetchGuild(params);
      DeathlogView.renderGuildHeader(data);
    } catch (e) {
      console.warn("[DeathlogController] Informações da guilda indisponíveis:", e.message);
    }
  },

  async loadDeaths(reset = false) {
    if (this.state.loading) return;
    this.state.loading = true;

    if (reset) DeathlogView.showLoading("deaths-container");

    const loadMoreBtn = document.getElementById("btn-load-more");

    try {
      const params = {
        limit: this.state.limit,
        ...this.state.filters
      };
      if (!reset && this.state.cursor) params.cursor = this.state.cursor;

      const data = await DeathlogModel.fetchDeaths(params);
      const deaths = data?.data || data?.deaths || (Array.isArray(data) ? data : []);

      if (reset) {
        this.state.deaths = deaths;
      } else {
        this.state.deaths = [...this.state.deaths, ...deaths];
      }

      this.state.cursor = data?.cursor || data?.nextCursor || null;
      this.state.hasMore = !!this.state.cursor;

      DeathlogView.renderDeaths(this.state.deaths, document.getElementById("deaths-container"));
      DeathlogView.updateStatBadge("stat-total-deaths", this.state.deaths.length);

      if (loadMoreBtn) {
        loadMoreBtn.style.display = this.state.hasMore ? "flex" : "none";
      }
    } catch (e) {
      console.error("[DeathlogController] loadDeaths error:", e);
      if (reset) DeathlogView.showError("deaths-container", `Falha ao carregar mortes: ${e.message}`);
    } finally {
      this.state.loading = false;
    }
  },

  async loadStreaks() {
    DeathlogView.showLoading("streaks-body");
    try {
      const data = await DeathlogModel.fetchStreaks();
      DeathlogView.renderStreaks(data);
    } catch (e) {
      DeathlogView.showError("streaks-body", `Falha ao carregar streaks: ${e.message}`);
    }
  },

  async loadDigest() {
    DeathlogView.showLoading("digest-body");
    try {
      const win = document.getElementById("filter-window")?.value || "7d";
      const data = await DeathlogModel.fetchDigest({ window: win });
      DeathlogView.renderDigest(data);
    } catch (e) {
      DeathlogView.showError("digest-body", `Falha ao carregar resumo: ${e.message}`);
    }
  },

  async loadCard() {
    try {
      const res = await DeathlogModel.fetchCardUrl({ theme: "blood" });
      if (res && res.cardUrl) {
        DeathlogView.renderCard(res.cardUrl);
      }
    } catch (e) {
      console.warn("[DeathlogController] Cartão memorial indisponível:", e.message);
    }
  }
};

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  DeathlogController.init().catch(err => {
    console.error("[DeathLog] Boot error:", err);
  });
});