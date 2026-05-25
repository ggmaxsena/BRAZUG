(function() {
    "use strict";

    const headerContainer = document.getElementById('universal-header');
    if (!headerContainer) return;

    function renderHeader() {
        const token = localStorage.getItem("brazug_admin_token");
        const username = localStorage.getItem("brazug_admin_user");
        const role = localStorage.getItem("brazug_admin_role");

        let authItems = `<li><a href="/login.html" class="nav-link">Login</a></li>`;

        if (token && username) {
            const isAuthorized = ['admin', 'guildmaster', 'officer'].includes(role);
            authItems = `
                <li><a href="/perfil.html" class="nav-link">Perfil</a></li>
                ${isAuthorized ? '<li><a href="/cadastro-aventura.html" class="nav-link">Nova Aventura</a></li>' : ''}
                ${role === 'admin' ? '<li><a href="/admin.html" class="nav-link">Admin</a></li>' : ''}
                <li><a href="#" class="nav-link" style="color: #ff4444;" id="nav-logout-btn">Sair</a></li>
            `;
        }

        headerContainer.innerHTML = `
            <div class="header-left">
                <a class="logo" href="/">
                    <img class="logo-img" src="/assets/branding/contentbra.png" alt="BRAZUG" width="40" height="40" />
                    <span class="logo-text">BRAZUG</span>
                </a>
                <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Abrir menu">
                    <span></span><span></span><span></span>
                </button>
            </div>
            
            <nav class="header-nav" id="header-nav">
                <ul class="nav-list">
                    <li><a href="/#lives" class="nav-link">Lives</a></li>
                    <li><a href="/#mural" class="nav-link">Mural</a></li>
                    <li><a href="/#herois" class="nav-link">Heróis</a></li>
                    ${authItems}
                </ul>
            </nav>

            <div class="header-center">
                <div class="spotify-player spotify-player-header">
                  <iframe
                    title="Spotify player"
                    src="https://open.spotify.com/embed/playlist/7dHRaqukEPMaQZSESR5v4C?utm_source=generator&autoplay=1"
                    width="100%"
                    height="80"
                    frameborder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  ></iframe>
                </div>
            </div>

            <div class="header-actions">
                <a class="header-discord" href="https://discord.gg/2Qt92YqjG" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
        `;

        const toggle = document.getElementById('menu-toggle');
        const nav = document.getElementById('header-nav');
        if (toggle && nav) {
            toggle.onclick = () => nav.classList.toggle('active');
        }

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
