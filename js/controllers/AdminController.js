(function (root) {
  "use strict";

  const AdminController = {
    async init() {
      const token = localStorage.getItem("brazug_admin_token");
      if (!token) return window.location.href = "/login.html";

      const dash = document.getElementById("dashboard-panel");
      if (dash) dash.hidden = false;

      const userForm = document.getElementById("user-form");
      if (userForm) {
        userForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(userForm);
          try {
            await AdminModel.createUser(fd.get("username"), fd.get("password"), fd.get("role"), token);
            alert("Usuário criado!");
            userForm.reset();
            this.init();
          } catch(e) { alert(e.message); }
        };
      }

      try {
        const advRes = await AdminModel.fetchAdventures(token);
        const adventures = Array.isArray(advRes) ? advRes : (advRes.adventures || []);
        AdminView.renderAdventures(adventures);

        const role = localStorage.getItem("brazug_admin_role");
        const usersPanel = document.getElementById("users-panel");
        const logsPanel = document.getElementById("logs-panel");
        
        if (usersPanel) usersPanel.hidden = (role !== "admin");
        if (logsPanel) logsPanel.hidden = (role !== "admin");

        if (role === "admin") {
          const userRes = await AdminModel.fetchUsers(token);
          const users = Array.isArray(userRes) ? userRes : (userRes.users || []);
          
          let page = 0;
          const render = () => {
            const filter = document.getElementById("user-search").value.toLowerCase();
            const filtered = users.filter(u => u.username.toLowerCase().includes(filter));
            const paginated = filtered.slice(page * 10, (page + 1) * 10);
            AdminView.renderUsers(paginated, () => this.init());
          };

          document.getElementById("user-search").oninput = () => { page = 0; render(); };
          render();
          
          const logsRes = await AdminModel.api("/logs", "GET", null, token);
          if (logsRes.logs) AdminView.renderLogs(logsRes.logs);
        }
      } catch (e) {
        console.error(e);
      }
    },

    async handleDelete(id) {
      if (!confirm("Confirmar exclusão?")) return;
      await AdminModel.deleteAdventure(id, localStorage.getItem("brazug_admin_token"));
      this.init();
    },

    async handleDeleteUser(id) {
        if (!confirm("Excluir este usuário?")) return;
        await AdminModel.api("/users/" + id, "DELETE", null, localStorage.getItem("brazug_admin_token"));
        this.init();
    },

    openEditModal(id, username, role) {
        const modal = document.getElementById("user-edit-modal");
        document.getElementById("edit-user-id").value = id;
        document.getElementById("edit-username").value = username;
        document.getElementById("edit-role").value = role;
        document.getElementById("edit-password").value = "";
        modal.hidden = false;
    },

    async handleEdit(id) {
      window.location.href = `/cadastro-aventura.html?id=${id}`;
    },

    async handleRoleUpdate(id) {
        const role = prompt("Nova role:");
        if (!role) return;
        await AdminModel.updateUserRole(id, role, localStorage.getItem("brazug_admin_token"));
        this.init();
    }
  };

  window.AdminController = AdminController;
  
  // Add form submission handler
  document.addEventListener("DOMContentLoaded", () => {
    const editForm = document.getElementById("user-edit-form");
    if(editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById("edit-user-id").value;
            const data = {
                username: document.getElementById("edit-username").value,
                role: document.getElementById("edit-role").value
            };
            const pass = document.getElementById("edit-password").value;
            if(pass) data.password = pass;

            try {
                await AdminModel.updateUser(id, data, localStorage.getItem("brazug_admin_token"));
                alert("Usuário atualizado!");
                document.getElementById("user-edit-modal").hidden = true;
                AdminController.init();
            } catch(e) { alert(e.message); }
        }
    }
    AdminController.init();
  });
})(window);
