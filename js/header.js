(function() {
    "use strict";

    const headerContainer = document.getElementById('universal-header');
    if (!headerContainer) return;

    function renderHeader() {
        const token = localStorage.getItem("brazug_admin_token");
        const username = localStorage.getItem("brazug_admin_user");

        let authItems = `<li><a href="/admin.html" class="nav-link" id="nav-auth-link">Login</a></li>`;

        if (token && username) {
            authItems = `
                <li><a href="/ficha.html" class="nav-link">${username}</a></li>
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
            <div class="header-actions">
                <a class="header-discord" href="https://discord.gg/2Qt92YqjG" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
        `;

        // Re-attach event listeners
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
