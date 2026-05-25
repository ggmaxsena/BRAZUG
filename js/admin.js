(function () {
  "use strict";

  const TOKEN_KEY = "brazug_admin_token";
  const ROLE_KEY = "brazug_admin_role";

  // Cache de elementos (uso opcional com validação)
  const elements = {
    dashboard: document.getElementById("dashboard-panel"),
    usersList: document.getElementById("users-list"),
    logsList: document.getElementById("logs-list"),
    adminList: document.getElementById("admin-list"),
    adventureForm: document.getElementById("adventure-form")
  };

  // Utils
  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function getRole() { return localStorage.getItem(ROLE_KEY) || ""; }
  function authHeaders() { return { Authorization: "Bearer " + getToken(), "Content-Type": "application/json" }; }
  
  async function api(path, options) {
    const res = await fetch("/api/admin" + path, options || {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro na requisição");
    return data;
  }

  // Módulos MVP
  const AdminModule = {
    async init() {
      if (!getToken()) return window.location.href = "/login.html";
      try {
        const me = await api("/me", { headers: authHeaders() });
        localStorage.setItem(ROLE_KEY, me.user.role);
        
        if (elements.dashboard) elements.dashboard.hidden = false;
        
        this.loadAdventures();
        if (me.user.role === "admin") {
          this.loadUsers();
          this.loadLogs();
        }

        // Populate author select if exists
        const authorSelect = document.getElementById("author-select");
        if (authorSelect) {
            const chars = await fetch("/api/characters").then(r => r.json());
            chars.filter(c => !c.is_dead).forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.name;
                opt.textContent = `${c.name} (${c.class})`;
                authorSelect.appendChild(opt);
            });
        }

        if (elements.adventureForm) {
            elements.adventureForm.onsubmit = async (e) => {
                e.preventDefault();
                const fd = new FormData(elements.adventureForm);
                const payload = {
                  title: fd.get("title"),
                  event_date: fd.get("event_date"),
                  body: fd.get("body"),
                  image_url: fd.get("image_url"),
                  published: !!fd.get("published"),
                  visibility: fd.get("visibility"),
                  author: fd.get("author_text") || fd.get("author_select") || ""
                };
                try {
                  await api("/adventures", "POST", payload, authHeaders());
                  alert("Aventura salva!");
                  elements.adventureForm.reset();
                } catch(e) { alert(e.message); }
            };
        }
      } catch (e) {
        window.location.href = "/login.html";
      }
    },

    async loadAdventures() {
      if (!elements.adminList) return;
      const data = await api("/adventures", { headers: authHeaders() });
      elements.adminList.innerHTML = (data.adventures || []).map(a => `
        <li>
          <div class="admin-list-info"><strong>${a.title}</strong><span>${a.event_date}</span></div>
          <div class="admin-list-actions">
            <button class="btn-small danger" onclick="AdminModule.deleteAdventure('${a.id}')">Excluir</button>
          </div>
        </li>
      `).join("");
    },

    async loadUsers() {
      if (!elements.usersList) return;
      const data = await api("/users", { headers: authHeaders() });
      elements.usersList.innerHTML = (data.users || []).map(u => `
        <li>
          <strong>${u.username}</strong> (${u.role})
          <button class="btn-small" onclick="AdminModule.resetPw('${u.id}', '${u.username}')">Senha</button>
        </li>
      `).join("");
    },

    async loadLogs() {
      if (!elements.logsList) return;
      const data = await api("/logs", { headers: authHeaders() });
      elements.logsList.innerHTML = (data.logs || []).map(l => `
        <li><strong>${l.timestamp}</strong>: ${l.message}</li>
      `).join("");
    },

    async deleteAdventure(id) {
      if (!confirm("Confirmar exclusão?")) return;
      await api("/adventures/" + id, { method: "DELETE", headers: authHeaders() });
      this.loadAdventures();
    },

    async resetPw(id, user) {
      const pass = prompt("Nova senha para " + user + ":");
      if (!pass) return;
      await api("/users/" + id + "/reset-password", { method: "POST", headers: authHeaders(), body: JSON.stringify({ password: pass }) });
      alert("Sucesso!");
    }
  };

  // Expor para o escopo global para onclicks
  window.AdminModule = AdminModule;
  AdminModule.init();

})();
