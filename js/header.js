(function() {
    "use strict";

    const headerContainer = document.getElementById('universal-header');
    if (!headerContainer) return;

    function renderHeader() {
        const token = localStorage.getItem("brazug_admin_token");
        const username = localStorage.getItem("brazug_admin_user");
        const role = localStorage.getItem("brazug_admin_role");

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
                <div class="spotify-wrap">
                  <iframe
                    src="https://open.spotify.com/embed/playlist/7dHRaqukEPMaQZSESR5v4C?utm_source=generator&autoplay=1"
                    frameborder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  ></iframe>
                </div>
                <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Abrir menu">
                    <span></span><span></span><span></span>
                </button>
                <a class="discord-btn" href="https://discord.gg/2Qt92YqjG" target="_blank" rel="noopener noreferrer">Discord</a>
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
