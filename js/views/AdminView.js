(function (root) {
  "use strict";

  const AdminView = {
    renderAdventures(list) {
      const el = document.getElementById("admin-list");
      if (!el) return;
      el.innerHTML = list.map(a => `
        <li>
          <strong>${this.escape(a.title)}</strong> - ${a.event_date}
          <button class="btn-small" onclick="AdminController.handleEdit('${a.id}')">Editar</button>
          <button class="btn-small danger" onclick="AdminController.handleDelete('${a.id}')">Excluir</button>
        </li>
      `).join("");
    },

    renderUsers(list) {
      const el = document.getElementById("users-list");
      if (!el) return;
      el.innerHTML = list.map(u => `
        <li>
          ${this.escape(u.username)} (${u.role})
          <button class="btn-small" onclick="AdminController.openEditModal('${u.id}', '${u.username}', '${u.role}')">Editar</button>
          <button class="btn-small danger" onclick="AdminController.handleDeleteUser('${u.id}')">Excluir</button>
        </li>
      `).join("");
    },

    renderLogs(list) {
      const el = document.getElementById("logs-list");
      if (!el) return;
      el.innerHTML = list.map(l => `
        <li><strong>${this.escape(l.timestamp)}</strong>: ${this.escape(l.message)}</li>
      `).join("");
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.AdminView = AdminView;
})(window);
