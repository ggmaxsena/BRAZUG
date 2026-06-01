(function (root) {
  "use strict";

  const AdminController = {
    async init() {
      const token = localStorage.getItem("brazug_admin_token");
      if (!token) return window.location.href = "/login.html";

      // Validação Real no Backend
      try {
        const me = await AdminModel.api("/me", "GET", null, token);
        if (!me || !me.user) throw new Error("Sessão inválida");
        
        // Atualiza o role local com o valor REAL vindo do backend (token)
        localStorage.setItem("brazug_admin_role", me.user.role);
        
        const isAdmin = me.user.role === "admin";
        if (!isAdmin && window.location.pathname.includes("admin.html")) {
            alert("Acesso negado: esta página é restrita para Administradores.");
            return window.location.href = "/";
        }

        // Gestão de visibilidade da seção de staff em cadastro-aventura.html
        const staffPanel = document.getElementById("staff-management");
        const isStaff = ["admin", "guildmaster", "officer"].includes(me.user.role);
        if (staffPanel) staffPanel.hidden = !isStaff;

        // Esconde link de voltar ao admin para quem não é admin
        const backToAdmin = document.getElementById("back-to-admin");
        if (backToAdmin) backToAdmin.style.display = (me.user.role === "admin" ? "inline" : "none");

      } catch (e) {
        console.error("Erro de autenticação:", e);
        localStorage.removeItem("brazug_admin_token");
        localStorage.removeItem("brazug_admin_role");
        return window.location.href = "/login.html";
      }

      const dash = document.getElementById("dashboard-panel");
      if (dash) dash.hidden = false;

      const userForm = document.getElementById("user-form");
      if (userForm) {
        userForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(userForm);
          try {
            await AdminModel.createUser(
                fd.get("username"), 
                fd.get("email"), 
                fd.get("password"), 
                fd.get("role"), 
                token
            );
            alert("Usuário criado!");
            userForm.reset();
            this.init();
          } catch(e) { alert(e.message); }
        };
      }

      try {
        // Adventure Form Logic (for cadastro-aventura.html)
        const adventureForm = document.getElementById("adventure-form");
        if (adventureForm) {
            // Initialize Quill
            let quill;
            if (typeof Quill !== 'undefined') {
                quill = new Quill('#editor-container', {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline', 'strike'],
                            ['blockquote', 'code-block'],
                            [{ 'header': 1 }, { 'header': 2 }],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'script': 'sub'}, { 'script': 'super' }],
                            [{ 'indent': '-1'}, { 'indent': '+1' }],
                            [{ 'direction': 'rtl' }],
                            [{ 'size': ['small', false, 'large', 'huge'] }],
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                            [{ 'color': [] }, { 'background': [] }],
                            [{ 'font': [] }],
                            [{ 'align': [] }],
                            ['clean'],
                            ['link', 'image']
                        ]
                    }
                });
            }

            // Populate author datalist
            const characterList = document.getElementById("characters-list");
            if (characterList) {
                try {
                    const chars = await fetch("/api/characters").then(r => r.json());
                    chars.filter(c => !c.is_dead).forEach(c => {
                        const opt = document.createElement("option");
                        opt.value = c.name;
                        characterList.appendChild(opt);
                    });
                } catch (e) { console.error("Erro ao carregar autores:", e); }
            }

            // Edit Mode Check
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('id');
            if (editId) {
                document.querySelector(".section-title").textContent = "Editar Aventura";
                const advRes = await AdminModel.fetchAdventures(token);
                const adventures = Array.isArray(advRes) ? advRes : (advRes.adventures || []);
                const adv = adventures.find(a => a.id === editId);
                if (adv) {
                    adventureForm.title.value = adv.title;
                    adventureForm.event_date.value = adv.event_date;
                    if (quill) quill.root.innerHTML = adv.body || "";
                    adventureForm.image_url.value = adv.image_url;
                    adventureForm.published.checked = !!adv.published;
                    adventureForm.visibility.value = adv.visibility;
                    const authorInput = document.getElementById("author-input");
                    if (authorInput) authorInput.value = adv.author || "";
                }
            }

            adventureForm.onsubmit = async (e) => {
                e.preventDefault();
                const fd = new FormData(adventureForm);
                let imageUrl = fd.get("image_url");

                const imageFile = adventureForm.image_file.files[0];
                if (imageFile) {
                    const upData = new FormData();
                    upData.append("image", imageFile);
                    try {
                        const upRes = await fetch("/api/admin/upload", {
                            method: "POST",
                            headers: { "Authorization": "Bearer " + token },
                            body: upData
                        });
                        const upResData = await upRes.json();
                        if (!upRes.ok) throw new Error(upResData.error || "Upload falhou");
                        imageUrl = upResData.url;
                    } catch (err) { return alert("Erro no upload: " + err.message); }
                }

                const payload = {
                  title: fd.get("title"),
                  event_date: fd.get("event_date"),
                  body: quill ? quill.root.innerHTML : fd.get("body"),
                  image_url: imageUrl,
                  published: adventureForm.published.checked,
                  visibility: fd.get("visibility"),
                  author: fd.get("author") || ""
                };

                try {
                  if (editId) {
                      await AdminModel.updateAdventure(editId, payload, token);
                  } else {
                      await AdminModel.api("/adventures", "POST", payload, token);
                  }
                  alert("Aventura salva!");
                  
                  // Redirecionamento inteligente: admins voltam para o painel, staff volta para a lista
                  if (me.user.role === "admin") {
                      window.location.href = "/admin.html";
                  } else {
                      window.location.href = "/cadastro-aventura.html";
                  }
                } catch(e) { alert(e.message); }
            };
        }

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
          const userSearch = document.getElementById("user-search");
          const render = () => {
            if (!userSearch) return;
            const filter = userSearch.value.toLowerCase();
            const filtered = users.filter(u => u.username.toLowerCase().includes(filter));
            const paginated = filtered.slice(page * 10, (page + 1) * 10);
            AdminView.renderUsers(paginated, () => this.init());
          };

          if (userSearch) {
            userSearch.oninput = () => { page = 0; render(); };
            render();
          }
          
          const logsRes = await AdminModel.api("/logs", "GET", null, token);
          if (logsRes.logs && document.getElementById("logs-list")) AdminView.renderLogs(logsRes.logs);
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

    async handleApprove(id) {
        if (!confirm("Deseja aprovar esta aventura para exibição pública?")) return;
        try {
            await AdminModel.api(`/adventures/${id}/approve`, "POST", null, localStorage.getItem("brazug_admin_token"));
            alert("Aventura aprovada com sucesso!");
            this.init();
        } catch (e) { alert(e.message); }
    },

    openEditModal(id, username, role, email) {
        const modal = document.getElementById("user-edit-modal");
        document.getElementById("edit-user-id").value = id;
        document.getElementById("edit-username").value = username;
        document.getElementById("edit-email").value = email || "";
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
                email: document.getElementById("edit-email").value,
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
