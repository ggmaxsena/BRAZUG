(function() {
    "use strict";

    const headerContainer = document.getElementById('universal-header');
    if (!headerContainer) return;

    async function getConfig() {
        if (window.BRAZUG_CONFIG) return window.BRAZUG_CONFIG;
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            window.BRAZUG_CONFIG = config;
            return config;
        } catch (e) {
            return { DISCORD_URL: 'https://discord.gg/brazug', FOREVER_HC_ACTIVE: false };
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

    async function renderHeader(skipSync) {
        const token    = localStorage.getItem("brazug_admin_token");
        const username = localStorage.getItem("brazug_admin_user");
        const role     = localStorage.getItem("brazug_admin_role");
        const config = await getConfig();
        const discordUrl = config.DISCORD_URL || 'https://discord.gg/brazug';
        const showDeathlog = Boolean(config.FOREVER_HC_ACTIVE);

        const staff = ["admin", "guildmaster", "officer"].includes((role || "").toLowerCase());
        const authItems = (token && username)
            ? `
                <span class="nav-user">${username}</span>
                <a href="/perfil.html" class="nav-link">Perfil</a>
                <a href="/ficha.html" class="nav-link">Personagens</a>
                ${role === "admin" ? '<a href="/admin.html" class="nav-link">Admin</a>' : ""}
                ${staff ? '<a href="/admin-core.html" class="nav-link">Inscrições</a>' : ""}
                <a href="#" class="nav-link nav-logout-btn">Sair</a>
            `
            : `
                <a href="/login.html" class="nav-link">Login</a>
                <a href="/register.html" class="nav-link">Cadastro</a>
            `;

        headerContainer.innerHTML = `
            <div class="header-left">
                <nav id="header-nav">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/#lives" class="nav-link">Streams ao Vivo</a>
                    <a href="/core.html" class="nav-link">COREs</a>
                    <div class="nav-auth">${authItems}</div>
                </nav>
            </div>

            <div class="header-logo">
                <a href="/">
                    <img src="/assets/branding/LOGO.png" class="logo-img" alt="BRAZUG">
                </a>
            </div>

            <div class="header-right">
                <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Abrir menu" aria-controls="header-nav" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>

                <!-- ☠ DEATH BADGE (oculto até o HC do WoW Forever começar) -->
                <div class="death-badge-wrap" id="death-badge-wrap"${showDeathlog ? "" : ' style="display: none;"'}>
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
                            <span class="death-pop-realm">WOW FOREVER</span>
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

                <nav class="account-menu" aria-label="Conta">${authItems}</nav>
                <a class="discord-btn" id="discord-nav-btn" href="${discordUrl}" target="_blank" rel="noopener noreferrer" aria-label="Discord da guilda">
                    <span class="discord-btn-online" id="discord-online-count"></span>
                    <svg class="discord-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    <span class="discord-btn-label">Discord</span>
                </a>
            </div>
        `;

        // Logout
        document.querySelectorAll(".nav-logout-btn").forEach((logoutBtn) => {
            logoutBtn.onclick = async (e) => {
                e.preventDefault();
                try {
                    await fetch("/api/auth/logout", { method: "POST" });
                } catch (err) {}
                localStorage.removeItem("brazug_admin_token");
                localStorage.removeItem("brazug_admin_user");
                localStorage.removeItem("brazug_admin_role");
                window.location.href = "/";
            };
        });

        const menuToggle = document.getElementById("menu-toggle");
        const headerNav = document.getElementById("header-nav");
        if (menuToggle && headerNav) {
            menuToggle.addEventListener("click", () => {
                const isOpen = headerNav.classList.toggle("active");
                menuToggle.setAttribute("aria-expanded", String(isOpen));
                document.body.classList.toggle("menu-open", isOpen);
            });
            headerNav.querySelectorAll("a").forEach((link) => {
                link.addEventListener("click", () => {
                    headerNav.classList.remove("active");
                    menuToggle.setAttribute("aria-expanded", "false");
                    document.body.classList.remove("menu-open");
                });
            });
            document.addEventListener("keydown", (event) => {
                if (event.key !== "Escape") return;
                headerNav.classList.remove("active");
                menuToggle.setAttribute("aria-expanded", "false");
                document.body.classList.remove("menu-open");
            });
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
        if (showDeathlog) hydrateDeathBadge();
        hydrateDiscordBtn();
        if (!skipSync) syncSession();
    }

    async function syncSession() {
        try {
            const res = await fetch("/api/auth/me");
            if (!res.ok) {
                if (localStorage.getItem("brazug_admin_token") === "session") {
                    localStorage.removeItem("brazug_admin_token");
                    localStorage.removeItem("brazug_admin_user");
                    localStorage.removeItem("brazug_admin_role");
                    renderHeader(true);
                }
                return;
            }
            const data = await res.json();
            if (!data.user) return;
            const changed = localStorage.getItem("brazug_admin_user") !== data.user.username;
            localStorage.setItem("brazug_admin_token", "session");
            localStorage.setItem("brazug_admin_user", data.user.username);
            localStorage.setItem("brazug_admin_role", data.user.role);
            if (changed) renderHeader(true);
        } catch (e) {}
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
