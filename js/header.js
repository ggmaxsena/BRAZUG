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

    async function renderHeader() {
        const token = localStorage.getItem("brazug_admin_token");
        const username = localStorage.getItem("brazug_admin_user");
        const role = localStorage.getItem("brazug_admin_role");
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
                <a class="discord-btn" href="${discordUrl}" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
        `;

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
    }

    renderHeader();
})();
