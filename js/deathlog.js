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
    const r = await fetch(`${API_BASE}/summary${qs ? "?" + qs : ""}`);
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

  MAP_ZONES: {
    1411: "Durotar",
    1412: "Mulgore",
    1413: "The Barrens",
    1414: "Kalimdor",
    1415: "Eastern Kingdoms",
    1416: "Alterac Mountains",
    1417: "Arathi Highlands",
    1418: "Badlands",
    1419: "Blasted Lands",
    1420: "Tirisfal Glades",
    1421: "Silverpine Forest",
    1422: "Western Plaguelands",
    1423: "Eastern Plaguelands",
    1424: "Hillsbrad Foothills",
    1425: "The Hinterlands",
    1426: "Dun Morogh",
    1427: "Searing Gorge",
    1428: "Burning Steppes",
    1429: "Elwynn Forest",
    1430: "Westfall",
    1431: "Redridge Mountains",
    1432: "Duskwood",
    1433: "Loch Modan",
    1434: "Wetlands",
    1435: "Swamp of Sorrows",
    1436: "Westfall",
    1437: "Stranglethorn Vale",
    1438: "Stonetalon Mountains",
    1439: "Desolace",
    1440: "Dustwallow Marsh",
    1441: "Feralas",
    1442: "Thousand Needles",
    1443: "Tanaris",
    1444: "Felwood",
    1445: "Un'Goro Crater",
    1446: "Moonglade",
    1447: "Silithus",
    1448: "Winterspring",
    1450: "Ashenvale",
    1451: "Teldrassil",
    1452: "Darkshore",
    1453: "Stormwind City",
    1454: "Orgrimmar",
    1455: "Ironforge",
    1456: "Thunder Bluff",
    1457: "Darnassus",
    1458: "Undercity"
  },

  getClass(id) {
    return this.CLASS_COLORS[id] || { name: "Desconhecido", color: "#aaa", icon: "❓" };
  },

  getZone(death) {
    if (!death) return "Azeroth";
    if (death.zone) return death.zone;
    if (death.zoneName) return death.zoneName;
    if (death.mapId && this.MAP_ZONES[death.mapId]) return this.MAP_ZONES[death.mapId];
    if (death.mapId) return `Zona ID ${death.mapId}`;
    return "Azeroth";
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

    // API retorna: data.data.summary.{deaths, avgLevel, highestLevel}
    const summary = data?.data?.summary ?? data?.summary ?? {};
    const totalDeaths = summary.deaths ?? "?";
    const avgLevel = summary.avgLevel != null ? summary.avgLevel.toFixed(1) : "?";
    const highestLevel = summary.highestLevel ?? "?";

    el.innerHTML = `
      <div class="guild-stat">
        <span class="guild-stat-value text-blood">${totalDeaths}</span>
        <span class="guild-stat-label">Mortes Totais</span>
      </div>
      <div class="guild-stat-divider"></div>
      <div class="guild-stat">
        <span class="guild-stat-value">${avgLevel}</span>
        <span class="guild-stat-label">Nível Médio</span>
      </div>
      <div class="guild-stat-divider"></div>
      <div class="guild-stat">
        <span class="guild-stat-value">${highestLevel}</span>
        <span class="guild-stat-label">Nível Máximo</span>
      </div>
    `;
  },

  buildDeathRow(death, index) {
    const classId = death.classId || death.class_id;
    const cls = this.getClass(classId);

    // Mapeamento dos campos schema Deathmap API -> Fallbacks locais
    const aliveStr = this.formatAlive(death.played || death.timeAlive || death.time_alive);
    const zone = this.getZone(death);
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
    const elSide = document.getElementById("streaks-body-side");

    // API retorna { data: { deathsToday, deaths24h, deaths7d, lastDeath, secondsSinceLastDeath } }
    const d = data?.data ?? data ?? {};
    const last = d.lastDeath ?? {};
    const cls = this.getClass(last.classId);
    const secsSince = d.secondsSinceLastDeath ?? null;
    const timeSince = secsSince != null ? this.formatAlive(secsSince) : null;
    const lastZone = this.getZone(last);

    if (el) {
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;padding:16px;">
          <div style="text-align:center;background:rgba(0,0,0,0.25);border:1px solid var(--border-soft);padding:14px;border-radius:var(--radius-sm);">
            <span style="display:block;font-family:'Orbitron',monospace;font-size:24px;font-weight:700;color:var(--blood-bright);">${d.deathsToday ?? 0}</span>
            <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Mortes Hoje</span>
          </div>
          <div style="text-align:center;background:rgba(0,0,0,0.25);border:1px solid var(--border-soft);padding:14px;border-radius:var(--radius-sm);">
            <span style="display:block;font-family:'Orbitron',monospace;font-size:24px;font-weight:700;color:var(--gold);">${d.deaths24h ?? 0}</span>
            <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Últimas 24h</span>
          </div>
          <div style="text-align:center;background:rgba(0,0,0,0.25);border:1px solid var(--border-soft);padding:14px;border-radius:var(--radius-sm);">
            <span style="display:block;font-family:'Orbitron',monospace;font-size:24px;font-weight:700;color:var(--text-primary);">${d.deaths7d ?? 0}</span>
            <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Últimos 7 dias</span>
          </div>
          ${timeSince ? `
          <div style="text-align:center;background:rgba(74,144,217,0.08);border:1px solid rgba(74,144,217,0.2);padding:14px;border-radius:var(--radius-sm);">
            <span style="display:block;font-family:'Orbitron',monospace;font-size:20px;font-weight:700;color:var(--accent-blue);">${timeSince}</span>
            <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Sem Baixas</span>
          </div>
          ` : ''}
        </div>
        ${last.name ? `
          <div style="margin:0 16px 16px;padding:16px;background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.25);border-radius:var(--radius-sm);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Última Queda Registrada</span>
              ${timeSince ? `<span style="font-size:11px;color:var(--gold);font-family:'Orbitron',monospace;">⏱ Há ${timeSince}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:28px;color:${cls.color};">${cls.icon}</span>
              <div>
                <strong style="color:${cls.color};font-family:'Cinzel',serif;font-size:16px;">${last.name}</strong>
                <span style="color:var(--text-muted);font-size:13px;"> — Nv. ${last.level ?? '?'} ${cls.name}</span>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                  ${last.sourceName ? `<span class="cause-tag cause-tag--killer">⚔ ${last.sourceName}</span>` : `<span class="cause-tag cause-tag--env">🌍 Ambiente</span>`}
                  <span class="zone-tag">📍 ${lastZone}</span>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      `;
    }

    if (elSide) {
      elSide.innerHTML = `
        <div style="padding:14px;display:flex;flex-direction:column;gap:12px;">
          ${timeSince ? `
          <div style="text-align:center;background:rgba(74,144,217,0.08);border:1px solid rgba(74,144,217,0.2);padding:10px;border-radius:var(--radius-sm);">
            <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;">Tempo sem Baixas</span>
            <span style="font-family:'Orbitron',monospace;font-size:18px;font-weight:700;color:var(--accent-blue);">${timeSince}</span>
          </div>
          ` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;">
            <div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border-soft);">
              <span style="display:block;font-family:'Orbitron',monospace;font-size:16px;font-weight:700;color:var(--blood-bright);">${d.deathsToday ?? 0}</span>
              <span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;">Hoje</span>
            </div>
            <div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border-soft);">
              <span style="display:block;font-family:'Orbitron',monospace;font-size:16px;font-weight:700;color:var(--gold);">${d.deaths24h ?? 0}</span>
              <span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;">24h</span>
            </div>
            <div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border-soft);">
              <span style="display:block;font-family:'Orbitron',monospace;font-size:16px;font-weight:700;color:var(--text-primary);">${d.deaths7d ?? 0}</span>
              <span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;">7d</span>
            </div>
          </div>
          ${last.name ? `
          <div style="border-top:1px solid var(--border-soft);padding-top:10px;margin-top:2px;">
            <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Última Queda</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;color:${cls.color}">${cls.icon}</span>
              <div style="overflow:hidden;">
                <div style="color:${cls.color};font-weight:600;font-size:13px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${last.name} <span style="font-size:11px;color:var(--text-muted);">(Nv ${last.level ?? '?'})</span></div>
                <div style="font-size:11px;color:var(--blood-bright);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">⚔ ${last.sourceName || 'Ambiente'}</div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      `;
    }
  },

  renderDigest(data) {
    const el = document.getElementById("digest-body");
    const elSide = document.getElementById("digest-body-side");

    const d = data?.digest || data?.data || data || {};
    const zoneObj = d.deadliestZone;
    const zoneName = zoneObj?.zone || zoneObj?.name || (typeof zoneObj === 'string' ? zoneObj : "—");
    const zoneDeaths = zoneObj?.deaths != null ? `${zoneObj.deaths} mortes` : "";

    const killerObj = d.deadliestKiller;
    const killerName = killerObj?.sourceName || killerObj?.name || (typeof killerObj === 'string' ? killerObj : (d.mostCommonKiller || d.most_common_killer || "—"));
    const killerKills = killerObj?.kills != null ? `${killerObj.kills} baixas` : "";

    const highest = d.highestDeath;
    const highestCls = highest ? this.getClass(highest.classId) : null;
    const words = d.notableLastWords;

    const deaths = d.deaths ?? d.totalDeaths ?? d.total_deaths ?? 0;
    const prevDeaths = d.previousWindowDeaths ?? null;

    let diffText = "";
    if (prevDeaths !== null) {
      const diff = deaths - prevDeaths;
      if (diff > 0) {
        diffText = `<span style="color:var(--blood-bright);font-size:11px;">(+${diff} vs anterior)</span>`;
      } else if (diff < 0) {
        diffText = `<span style="color:#2ecc71;font-size:11px;">(${diff} vs anterior)</span>`;
      } else {
        diffText = `<span style="color:var(--text-muted);font-size:11px;">(= anterior)</span>`;
      }
    }

    if (el) {
      el.innerHTML = `
        <div class="digest-grid">
          <div class="digest-item">
            <span class="digest-val text-blood">${deaths}</span>
            <span class="digest-lbl">Mortes no Período ${diffText}</span>
          </div>
          <div class="digest-item">
            <span class="digest-val">${prevDeaths ?? "—"}</span>
            <span class="digest-lbl">Período Anterior</span>
          </div>
          <div class="digest-item">
            <span class="digest-val" style="font-size:18px;color:var(--gold);">${zoneName}</span>
            <span class="digest-lbl">${zoneDeaths ? `Zona Mais Letal (${zoneDeaths})` : 'Zona Mais Letal'}</span>
          </div>
          <div class="digest-item">
            <span class="digest-val" style="font-size:18px;color:var(--blood-bright);">${killerName}</span>
            <span class="digest-lbl">${killerKills ? `Assassino Favorito (${killerKills})` : 'Assassino Favorito'}</span>
          </div>
        </div>

        ${highest ? `
          <div style="margin-top:16px;padding:14px;background:rgba(0,0,0,0.25);border:1px solid var(--border-soft);border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px;">
            <span style="font-size:24px;">👑</span>
            <div style="flex:1;">
              <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;">Maior Perda do Período</span>
              <strong style="color:${highestCls ? highestCls.color : 'var(--gold)'};font-family:'Cinzel',serif;font-size:15px;">${highest.name}</strong>
              <span style="color:var(--text-muted);font-size:12px;"> — Nv. ${highest.level} ${highestCls ? highestCls.name : ''}</span>
              ${highest.sourceName ? `<span style="font-size:12px;color:var(--blood-bright);margin-left:8px;">⚔ ${highest.sourceName}</span>` : ''}
            </div>
          </div>
        ` : ''}

        ${words ? `
          <div style="margin-top:12px;padding:14px;background:rgba(212,168,71,0.06);border:1px solid rgba(212,168,71,0.2);border-radius:var(--radius-sm);">
            <span style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">💬 Últimas Palavras Notáveis</span>
            <blockquote style="font-style:italic;color:var(--text-primary);font-size:13px;margin:0 0 6px;">"${words.lastWords}"</blockquote>
            <span style="font-size:11px;color:var(--text-muted);">— ${words.name} (Nv. ${words.level})</span>
          </div>
        ` : ''}
      `;
    }

    if (elSide) {
      elSide.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft)">
            <span style="font-size:12px;color:var(--text-muted)">Mortes no Período</span>
            <span style="font-family:'Orbitron',monospace;color:var(--blood-bright);font-weight:700">${deaths} ${diffText}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft)">
            <span style="font-size:12px;color:var(--text-muted)">Período Anterior</span>
            <span style="font-family:'Orbitron',monospace;font-weight:700">${prevDeaths ?? "—"}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft)">
            <span style="font-size:12px;color:var(--text-muted)">Zona mais letal</span>
            <span style="font-size:12px;color:var(--gold);text-align:right;max-width:140px;font-weight:600">${zoneName} ${zoneDeaths ? `<small style="display:block;font-size:10px;color:var(--text-dim);font-weight:normal">${zoneDeaths}</small>` : ''}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft)">
            <span style="font-size:12px;color:var(--text-muted)">Maior ameaça</span>
            <span style="font-size:12px;color:var(--blood-bright);text-align:right;max-width:130px;font-weight:600">${killerName} ${killerKills ? `<small style="display:block;font-size:10px;color:var(--text-dim);font-weight:normal">${killerKills}</small>` : ''}</span>
          </div>
          ${highest ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0">
            <span style="font-size:12px;color:var(--text-muted)">Maior perda</span>
            <span style="font-size:12px;color:${highestCls ? highestCls.color : 'var(--text-primary)'};text-align:right;font-weight:600">${highest.name} <small style="color:var(--text-muted)">(Nv ${highest.level})</small></span>
          </div>
          ` : ''}
        </div>
      `;
    }
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

  renderGuildStats(data) {
    const recent = data?.data?.recentDeaths || [];
    
    // 1. O Tempo Roubado (sum of played)
    const totalPlayedSecs = recent.reduce((sum, d) => sum + (d.played || 0), 0);
    const timeLostEl = document.getElementById("stat-time-lost");
    if (timeLostEl) {
      const formatted = this.formatAlive(totalPlayedSecs);
      timeLostEl.textContent = formatted ? formatted : "Nenhum";
    }

    // 2. Mortalidade por Classe
    const classBreakdown = data?.data?.classBreakdown || [];
    const classContainer = document.getElementById("stat-class-breakdown");
    if (classContainer) {
      if (!classBreakdown.length) {
         classContainer.innerHTML = '<p class="no-data">Sem dados de classe</p>';
      } else {
         const maxClass = Math.max(...classBreakdown.map(c => c.deaths));
         classContainer.innerHTML = classBreakdown.sort((a,b)=>b.deaths-a.deaths).map(c => {
            const cls = this.getClass(c.classId);
            const pct = (c.deaths / maxClass) * 100;
            return `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                  <span style="color: ${cls.color}; font-weight: 600; letter-spacing: 1px;">${cls.icon} ${cls.name.toUpperCase()}</span>
                  <span style="color: var(--text-muted); font-family: 'Orbitron', monospace; font-weight: bold;">${c.deaths}</span>
                </div>
                <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.02);">
                  <div style="background: ${cls.color}; width: ${pct}%; height: 100%; box-shadow: 0 0 10px ${cls.color}; border-radius: 4px;"></div>
                </div>
              </div>
            `;
         }).join("");
      }
    }

    // 3. Mortalidade por Raça
    const RACE_NAMES = { 1: "Human", 2: "Orc", 3: "Dwarf", 4: "Night Elf", 5: "Undead", 6: "Tauren", 7: "Gnome", 8: "Troll" };
    const RACE_COLORS = { 2: "#62c23c", 5: "#85739c", 6: "#c28e3c", 8: "#3cacc2" }; // Horda
    const raceBreakdown = data?.data?.raceBreakdown || [];
    const raceContainer = document.getElementById("stat-race-breakdown");
    if (raceContainer) {
      if (!raceBreakdown.length) {
         raceContainer.innerHTML = '<p class="no-data">Sem dados de raça</p>';
      } else {
         const maxRace = Math.max(...raceBreakdown.map(r => r.deaths));
         raceContainer.innerHTML = raceBreakdown.sort((a,b)=>b.deaths-a.deaths).map(r => {
            const rName = RACE_NAMES[r.raceId] || `Raça ${r.raceId}`;
            const rColor = RACE_COLORS[r.raceId] || "var(--text-muted)";
            const pct = (r.deaths / maxRace) * 100;
            return `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                  <span style="color: ${rColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${rName}</span>
                  <span style="color: var(--text-muted); font-family: 'Orbitron', monospace; font-weight: bold;">${r.deaths}</span>
                </div>
                <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.02);">
                  <div style="background: ${rColor}; width: ${pct}%; height: 100%; box-shadow: 0 0 10px ${rColor}; border-radius: 4px;"></div>
                </div>
              </div>
            `;
         }).join("");
      }
    }

    // 4. O Carniceiro
    const butcherContainer = document.getElementById("stat-butcher");
    if (butcherContainer) {
      if (!recent.length) {
         butcherContainer.innerHTML = '<p class="no-data">Sem dados recentes</p>';
      } else {
         const killers = {};
         recent.forEach(d => {
            const killer = d.sourceName || d.killedBy || d.killer || d.killed_by;
            if (killer && d.sourceKind !== 'environment') killers[killer] = (killers[killer] || 0) + 1;
         });
         const sortedKillers = Object.entries(killers).sort((a,b)=>b[1]-a[1]).slice(0, 7);
         if (sortedKillers.length === 0) {
            butcherContainer.innerHTML = '<p class="no-data">Nenhum abate de NPC recente</p>';
         } else {
            butcherContainer.innerHTML = sortedKillers.map((k, i) => {
               const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀";
               return `
                 <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                   <span style="font-size: 13px; color: ${i===0 ? 'var(--blood-bright)' : 'var(--text-primary)'}">${medal} ${k[0]}</span>
                   <span style="font-size: 14px; font-weight: bold; font-family: 'Orbitron', monospace; color: var(--gold);">${k[1]}x</span>
                 </div>
               `;
            }).join("");
         }
      }
    }
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
      DeathlogView.renderGuildStats(data);
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