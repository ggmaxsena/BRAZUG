(function() {
    "use strict";

    const headerContainer = document.getElementById('universal-header');
    if (!headerContainer) return;

    async function getDiscordUrl() {
        if (window.BRAZUG_CONFIG && window.BRAZUG_CONFIG.DISCORD_URL) {
            return window.BRAZUG_CONFIG.DISCORD_URL;
        }
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            window.BRAZUG_CONFIG = config;
            return config.DISCORD_URL;
        } catch (e) {
            return 'https://discord.gg/brazug';
        }
    }

    /** Busca dados do DeathMap e retorna resumo para o badge */
    async function fetchDeathBadgeData() {
        try {
            const [deathsRes, guildRes] = await Promise.allSettled([
                fetch('/api/brazug/deaths?limit=3'),
                fetch('/api/brazug/summary')
            ]);

            const deaths = deathsRes.status === 'fulfilled' && deathsRes.value.ok
                ? await deathsRes.value.json() : null;

            const guild = guildRes.status === 'fulfilled' && guildRes.value.ok
                ? await guildRes.value.json() : null;

            const totalDeaths = guild?.totalDeaths ?? guild?.total_deaths ?? '—';
            const avgLevel   = guild?.avgLevel   ?? guild?.avg_level   ?? null;

            // Última morte para o badge
            const lastDeathArr = deaths?.deaths ?? deaths?.data ?? [];
            const last = lastDeathArr[0] ?? null;
            const lastName  = last?.name ?? last?.characterName ?? last?.character_name ?? null;
            const lastLevel = last?.level ?? last?.characterLevel ?? null;

            return { totalDeaths, avgLevel, lastName, lastLevel, lastDeaths: lastDeathArr.slice(0, 3) };
        } catch {
            return { totalDeaths: '—', avgLevel: null, lastName: null, lastLevel: null, lastDeaths: [] };
        }
    }

    /** Injeta dados reais no badge após o render inicial */
    async function hydrateDeathBadge() {
        const data = await fetchDeathBadgeData();

        const badgeCount  = document.getElementById('death-badge-count');
        const badgeLast   = document.getElementById('death-badge-last');
        const popTotal    = document.getElementById('death-pop-total');
        const popAvg      = document.getElementById('death-pop-avg');
        const popList     = document.getElementById('death-pop-list');

        if (badgeCount)  badgeCount.textContent  = data.totalDeaths;
        if (badgeLast && data.lastName) {
            badgeLast.textContent = `${data.lastName}${data.lastLevel ? ` (Lv ${data.lastLevel})` : ''}`;
            badgeLast.parentElement.hidden = false;
        }
        if (popTotal)   popTotal.textContent  = data.totalDeaths;
        if (popAvg)     popAvg.textContent    = data.avgLevel ?? '—';
        
        if (popList && data.lastDeaths.length > 0) {
            popList.innerHTML = data.lastDeaths.map(d => {
                const name = d.name || d.characterName || 'Aventureiro';
                const lvl = d.level || '?';
                const killer = d.sourceName || d.killedBy || d.killer || 'Ambiente';
                const classColors = {
                    1: "#C79C6E", 2: "#F58CBA", 3: "#ABD473", 4: "#FFF569", 
                    5: "#FFFFFF", 6: "#C41F3B", 7: "#0070DE", 8: "#40C7EB", 
                    9: "#8787ED", 11: "#FF7D0A"
                };
                const color = classColors[d.classId || d.class_id] || '#aaa';
                
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px;">
                        <div>
                            <strong style="color: ${color}">${name}</strong> <span style="color:#666">(Lv ${lvl})</span>
                        </div>
                        <div style="color: #e8a0a0; text-align:right; font-size: 10px; max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${killer}">
                            ⚔ ${killer}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    async function renderHeader() {
        const token    = localStorage.getItem("brazug_admin_token");
        const username = localStorage.getItem("brazug_admin_user");
        const role     = localStorage.getItem("brazug_admin_role");
        const discordUrl = await getDiscordUrl();

        let authItems = `<a href="/login.html" class="nav-link">Login</a>`;

        if (token && username) {
            authItems = `
                <a href="/perfil.html" class="nav-link">Perfil</a>
                <a href="/ficha.html" class="nav-link">Meus Personagens</a>
                ${role === 'admin' ? '<a href="/admin.html" class="nav-link">Admin</a>' : ''}
                <a href="#" class="nav-link" style="color: #ff4444;" id="nav-logout-btn">Sair</a>
            `;
        }

        headerContainer.innerHTML = `
            <div class="header-left">
                <nav id="header-nav">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/#mural" class="nav-link">Mural</a>
                    <a href="/talents/" class="nav-link">Talentos</a>
                    <a href="/#lives" class="nav-link">Streams ao vivo</a>
                    ${authItems}
                </nav>
            </div>

            <div class="header-logo">
                <a href="/">
                    <img src="/assets/branding/LOGO.png" class="logo-img" alt="BRAZUG">
                </a>
            </div>

            <div class="header-right">
                <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Abrir menu">
                    <span></span><span></span><span></span>
                </button>

                <!-- ☠ DEATH BADGE -->
                <div class="death-badge-wrap" id="death-badge-wrap">
                    <button class="death-badge-btn" id="death-badge-btn" aria-haspopup="true" aria-expanded="false">
                        <span class="death-badge-skull">☠</span>
                        <span class="death-badge-count" id="death-badge-count">…</span>
                        <span class="death-badge-sep">|</span>
                        <span class="death-badge-last-wrap" hidden>
                            Última: <strong class="death-badge-last" id="death-badge-last"></strong>
                        </span>
                        <span class="death-badge-caret">▾</span>
                    </button>

                    <div class="death-popover" id="death-popover" role="dialog" aria-label="Mortes Hardcore">
                        <div class="death-pop-header">
                            <span class="death-pop-title">MORTES HARDCORE</span>
                            <span class="death-pop-realm">Doomhowl</span>
                        </div>

                        <div class="death-pop-stats">
                            <div class="death-pop-stat">
                                <p class="death-pop-stat-label">TOTAL DE MORTES</p>
                                <p class="death-pop-stat-val death-pop-stat-val--gold" id="death-pop-total">…</p>
                            </div>
                            <div class="death-pop-stat">
                                <p class="death-pop-stat-label">MÉDIA DE NÍVEL</p>
                                <p class="death-pop-stat-val" id="death-pop-avg">…</p>
                            </div>
                        </div>

                        <div class="death-pop-list" id="death-pop-list" style="margin-bottom: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; padding: 4px 10px;">
                            <p style="color:#666; font-size:10px; text-align:center; padding: 10px 0;">Sem mortes recentes.</p>
                        </div>

                        <a href="/deathlog" class="death-pop-cta">VER MURAL DA MORTE</a>
                    </div>
                </div>
                <!-- / DEATH BADGE -->

                <a class="discord-btn" href="${discordUrl}" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
        `;

        // Logout
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                localStorage.removeItem("brazug_admin_token");
                localStorage.removeItem("brazug_admin_user");
                localStorage.removeItem("brazug_admin_role");
                window.location.href = "/";
            };
        }

        // Toggle popover no click (mobile-friendly) + fechar ao clicar fora
        const badgeBtn  = document.getElementById('death-badge-btn');
        const popover   = document.getElementById('death-popover');

        if (badgeBtn && popover) {
            badgeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = badgeBtn.getAttribute('aria-expanded') === 'true';
                badgeBtn.setAttribute('aria-expanded', String(!open));
                popover.classList.toggle('is-open', !open);
            });
            document.addEventListener('click', () => {
                badgeBtn.setAttribute('aria-expanded', 'false');
                popover.classList.remove('is-open');
            });
            popover.addEventListener('click', (e) => e.stopPropagation());
        }

        // Hidrata com dados reais assincronamente
        hydrateDeathBadge();
    }

    renderHeader();
})();
