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

            const summary = guild?.data?.summary ?? guild?.summary ?? {};
            const totalDeaths = summary.deaths ?? guild?.totalDeaths ?? guild?.total_deaths ?? '—';
            const avgLevelRaw = summary.avgLevel ?? guild?.avgLevel ?? guild?.avg_level ?? null;
            const avgLevel = avgLevelRaw ? avgLevelRaw.toFixed(1) : null;

            // Última morte para o badge — vem de recentDeaths da guilda
            const recentDeaths = guild?.data?.recentDeaths ?? guild?.recentDeaths ?? [];
            const lastDeathArr = recentDeaths.length > 0 ? recentDeaths : (deaths?.deaths ?? deaths?.data ?? []);
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

        if (badgeCount)  badgeCount.textContent  = `${data.totalDeaths} MORTES`;
        if (badgeLast && data.lastName) {
            badgeLast.innerHTML = `${data.lastName} <span class="death-badge-last-lvl">(Nv ${data.lastLevel || '?'})</span>`;
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
                const color = classColors[d.classId || d.class_id] || '#F7C14D';
                
                return `
                    <div class="death-pop-list-item">
                        <div class="death-pop-list-char">
                            <strong style="color: ${color}">${name}</strong>
                            <span class="death-pop-list-lvl">(Nv ${lvl})</span>
                        </div>
                        <span class="death-pop-list-killer" title="${killer}">
                            ⚔ ${killer}
                        </span>
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
                    <a href="/#lives" class="nav-link">Streams ao Vivo</a>
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
                        <span class="death-badge-skull">☠️</span>
                        
                        <div class="death-badge-inner">
                            <span class="death-badge-count" id="death-badge-count">…</span>
                            <span class="death-badge-sep">|</span>
                            <span class="death-badge-last-wrap" hidden>
                                Última: <strong class="death-badge-last" id="death-badge-last"></strong>
                            </span>
                        </div>

                        <span class="death-badge-caret">▼</span>
                    </button>

                    <div class="death-popover" id="death-popover" role="dialog" aria-label="Mortes Hardcore">
                        <div class="death-pop-header">
                            <div class="death-pop-title-wrap">
                                <span class="death-pop-skull-icon">☠</span>
                                <span class="death-pop-title">Mural de Baixas</span>
                            </div>
                            <span class="death-pop-realm">DOOMHOWL</span>
                        </div>

                        <div class="death-pop-stats">
                            <div class="death-pop-stat death-pop-stat--red">
                                <p class="death-pop-stat-label">Total de Mortes</p>
                                <p class="death-pop-stat-val death-pop-stat-val--gold" id="death-pop-total">…</p>
                            </div>
                            <div class="death-pop-stat death-pop-stat--dark">
                                <p class="death-pop-stat-label">Média de Nível</p>
                                <p class="death-pop-stat-val death-pop-stat-val--white" id="death-pop-avg">…</p>
                            </div>
                        </div>

                        <p class="death-pop-list-title">Últimos Heróis Caídos</p>
                        <div class="death-pop-list" id="death-pop-list">
                            <p style="color:#666; font-size:10px; text-align:center; padding: 10px 0;">Sem mortes recentes.</p>
                        </div>

                        <a href="/deathlog" class="death-pop-cta">Ver Estatísticas Completas →</a>
                    </div>
                </div>
                <!-- / DEATH BADGE -->

                <a class="discord-btn" id="discord-nav-btn" href="${discordUrl}" target="_blank" rel="noopener noreferrer">
                    <span class="discord-btn-online" id="discord-online-count"></span>
                    Discord
                </a>
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
        hydrateDiscordBtn();
    }

    /** Busca membros online via API pública do Discord */
    async function hydrateDiscordBtn() {
        try {
            const res = await fetch('https://discord.com/api/guilds/1466121307036061899/widget.json');
            if (!res.ok) return;
            const data = await res.json();
            const online = data?.presence_count ?? null;
            const el = document.getElementById('discord-online-count');
            if (el && online !== null) {
                el.textContent = online;
                el.classList.add('visible');
            }
        } catch {
            // silently fail — botão continua funcionando sem o count
        }
    }

    renderHeader();
})();
