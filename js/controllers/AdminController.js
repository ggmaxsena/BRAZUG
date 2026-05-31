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
                  window.location.href = "/admin.html";
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
