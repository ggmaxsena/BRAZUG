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
      el.innerHTML = list.map(u => {
        const verifiedBadge = u.email && !u.is_verified 
          ? '<span style="color: #ff4444; font-size: 11px; margin-left: 5px;">(Não verificado)</span>' 
          : '';
        return `
        <li style="border-bottom: 1px solid #222; padding: 10px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${this.escape(u.username)}</strong> (${u.role})${verifiedBadge}
              <div style="font-size: 12px; color: #888;">${this.escape(u.email || 'Sem e-mail')}</div>
            </div>
            <div>
              <button class="btn-small" onclick="AdminController.openEditModal('${u.id}', '${u.username}', '${u.role}', '${u.email || ''}')">Editar</button>
              <button class="btn-small danger" onclick="AdminController.handleDeleteUser('${u.id}')">Excluir</button>
            </div>
          </div>
        </li>
      `}).join("");
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
