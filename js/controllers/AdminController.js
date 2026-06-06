(function (root) {
  "use strict";

  const AdminController = {
    adventuresCache: [],

    formatDateForInput(dateVal) {
      if (!dateVal) return "";
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split('T')[0];
      } catch (e) {
        return "";
      }
    },

    async init() {
      const token = localStorage.getItem("brazug_admin_token");
      if (!token) return window.location.href = "/login.html";

      // Validação Real no Backend
      let serverRole = "";
      try {
        const me = await AdminModel.api("/me", "GET", null, token);
        if (!me || !me.user) throw new Error("Sessão inválida");
        
        serverRole = me.user.role;
        // Atualiza o role local com o valor REAL vindo do backend (token) para consistência da UI
        localStorage.setItem("brazug_admin_role", serverRole);
        
        if (window.location.pathname.includes("admin.html") && serverRole !== "admin") {
            alert("Acesso negado: esta página é restrita para Administradores.");
            window.location.href = "/";
            return;
        }

        // Se chegou aqui em admin.html, é admin de fato.
        const dash = document.getElementById("dashboard-panel");
        if (dash) dash.hidden = false;

        // Gestão de visibilidade da seção de staff em cadastro-aventura.html
        const staffPanel = document.getElementById("staff-management");
        const isStaff = ["admin", "guildmaster", "officer"].includes(serverRole);
        if (staffPanel) staffPanel.hidden = !isStaff;

        // Esconde link de voltar ao admin para quem não é admin
        const backToAdmin = document.getElementById("back-to-admin");
        if (backToAdmin) backToAdmin.style.display = (serverRole === "admin" ? "inline" : "none");

      } catch (e) {
        console.error("Erro de autenticação:", e);
        localStorage.removeItem("brazug_admin_token");
        localStorage.removeItem("brazug_admin_role");
        window.location.href = "/login.html";
        return;
      }

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
        const isEditPage = window.location.pathname.includes("cadastro-aventura.html");
        const isAdminPage = window.location.pathname.includes("admin.html");

        const advRes = await AdminModel.fetchAdventures(token);
        const adventures = Array.isArray(advRes) ? advRes : (advRes.adventures || []);
        this.adventuresCache = adventures;

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
                // Tenta encontrar o título da seção específico da página de cadastro
                const titleEl = document.querySelector(".panel-title");
                if (titleEl && isEditPage) titleEl.textContent = "Editar Aventura";
                
                try {
                    console.log("[Admin] Buscando dados da aventura para edição:", editId);
                    const res = await AdminModel.fetchAdventure(editId, token);
                    const adv = res.adventure;
                    
                    if (adv) {
                        console.log("[Admin] Populando formulário com:", adv.title);
                        adventureForm.title.value = adv.title;
                        adventureForm.event_date.value = this.formatDateForInput(adv.event_date);
                        if (quill) quill.root.innerHTML = adv.body || "";
                        adventureForm.image_url.value = adv.image_url;
                        adventureForm.published.checked = !!adv.published;
                        adventureForm.visibility.value = adv.visibility;
                        const authorInput = document.getElementById("author-input");
                        if (authorInput) authorInput.value = adv.author || "";
                    } else {
                        console.warn("[Admin] Aventura não encontrada no servidor:", editId);
                    }
                } catch (err) {
                    console.error("[Admin] Erro ao carregar aventura para edição:", err);
                    alert(`Erro ao carregar os dados: ${err.message}. Verifique o console do navegador para detalhes.`);
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
                  
                  // Redirecionamento: se for staff volta para o painel se estiver lá, ou recarrega
                  if (serverRole === "admin" || isAdminPage) {
                      window.location.href = "/admin.html";
                  } else {
                      window.location.href = "/cadastro-aventura.html";
                  }
                } catch(e) { alert(e.message); }
            };
        }

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
    },

    handlePreview(id) {
      const adventure = this.adventuresCache.find(a => a.id === id);
      if (!adventure) return alert("Aventura não encontrada no cache.");

      const modal = document.getElementById("mural-modal");
      if (!modal) return;

      const img = document.getElementById("mural-modal-img");
      if (img) {
          img.src = adventure.image_url || "";
          img.style.display = adventure.image_url ? "block" : "none";
      }

      document.getElementById("mural-modal-title").textContent = adventure.title;
      
      const rawBody = this.renderBody(adventure.body);
      let cleanBody = "";
      if (typeof DOMPurify !== 'undefined') {
          cleanBody = DOMPurify.sanitize(rawBody);
      } else {
          console.warn("DOMPurify não carregado. Usando fallback seguro.");
          const div = document.createElement("div");
          div.textContent = rawBody.replace(/<[^>]*>/g, ""); // Remove tags se não puder sanitizar
          cleanBody = div.innerHTML;
      }
      document.getElementById("mural-modal-body").innerHTML = cleanBody;
      
      document.getElementById("mural-modal-date").textContent = adventure.event_date;
      document.getElementById("mural-modal-author").textContent = "Relato de: " + adventure.author;

      const handleEsc = (e) => {
        if (e.key === "Escape") close();
      };

      const close = () => {
        modal.hidden = true;
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleEsc);
      };

      modal.hidden = false;
      document.body.style.overflow = "hidden";

      modal.querySelectorAll("[data-action='close']").forEach(btn => btn.onclick = close);
      const backdrop = modal.querySelector(".mural-modal-backdrop");
      if (backdrop) backdrop.onclick = close;

      document.addEventListener("keydown", handleEsc);
    },

    renderBody(text) {
        if (!text) return "";
        if (text.trim().startsWith('{')) {
            try {
                const data = JSON.parse(text);
                if (data.blocks) {
                    return data.blocks.map(block => {
                        switch (block.type) {
                            case 'paragraph':
                                return `<p style="margin-bottom: 1.2em; line-height: 1.7;">${block.data.text}</p>`;
                            case 'header':
                                return `<h${block.data.level} style="color: var(--gold); margin: 1.2em 0 0.5em 0;">${block.data.text}</h${block.data.level}>`;
                            case 'list':
                                const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
                                const items = block.data.items.map(item => `<li style="margin-bottom: 0.4em;">${item}</li>`).join('');
                                return `<${tag} style="margin-bottom: 1.2em; padding-left: 20px;">${items}</${tag}>`;
                            case 'image':
                                return `<div style="margin: 20px 0; text-align: center;">
                                    <img src="${block.data.file?.url || block.data.url}" style="max-width: 100%; border-radius: 8px; border: 1px solid #333;">
                                    ${block.data.caption ? `<p style="font-size: 0.85em; color: #888; margin-top: 8px;">${block.data.caption}</p>` : ""}
                                </div>`;
                            case 'quote':
                                return `<blockquote style="border-left: 3px solid var(--gold); padding: 5px 15px; font-style: italic; background: rgba(255,255,255,0.03); margin-bottom: 1.2em;">${block.data.text}</blockquote>`;
                            default:
                                return "";
                        }
                    }).join("");
                }
            } catch (e) {}
        }
        return text; // Fallback para HTML legado
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
