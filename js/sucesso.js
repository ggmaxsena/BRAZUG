document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("sucesso-grid");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const modal = document.getElementById("modal-sucesso");
    const form = document.getElementById("form-sucesso");

    // Verificar auth
    const token = localStorage.getItem("brazug_admin_token");
    let userRole = localStorage.getItem("brazug_admin_role") || "guest";

    if (token) {
        try {
            // Decodifica JWT payload simples sem checar assinatura (backend faz a verificação real)
            const payloadBase64 = token.split('.')[1];
            if (payloadBase64) {
                const payload = JSON.parse(atob(payloadBase64));
                userRole = payload.r || payload.role || userRole;
            }
        } catch (e) {
            console.error("Erro ao decodificar token", e);
        }
    }

    const isStaff = ["admin", "officer", "guildmaster"].includes(userRole);



    // Carregar sucessos
    async function loadSuccesses() {
        try {
            const res = await fetch("/api/sucesso");
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Erro ao carregar");

            grid.innerHTML = "";
            if (data.length === 0 && !isStaff) {
                grid.innerHTML = '<div style="text-align:center; grid-column: 1/-1; color: var(--text-muted);">Nenhum sucesso registrado ainda.</div>';
                return;
            }

            if (isStaff) {
                const addCard = document.createElement("div");
                addCard.className = "sucesso-card sucesso-card-add";
                addCard.id = "card-add-sucesso";
                addCard.innerHTML = `
                    <i class="fas fa-plus-circle"></i>
                    <div>Registrar Novo Sucesso</div>
                `;
                grid.appendChild(addCard);
                addCard.addEventListener("click", () => modal.style.display = "flex");
            }

            data.forEach(item => {
                const card = document.createElement("div");
                card.className = "sucesso-card";

                const dateObj = new Date(item.created_at);
                const dateStr = dateObj.toLocaleDateString("pt-BR");

                let deleteBtnHtml = '';
                let editBtnHtml = '';
                if (isStaff) {
                    editBtnHtml = `<button class="btn-edit-sucesso" data-id="${item.id}" style="display:block;" title="Editar"><i class="fas fa-edit"></i></button>`;
                    deleteBtnHtml = `<button class="btn-delete-sucesso" data-id="${item.id}" style="display:block;" title="Excluir"><i class="fas fa-trash"></i></button>`;
                }

                let mediaHtml = '';
                const imgUrl = item.image_url || '/assets/branding/bg_content.jpg';
                mediaHtml += `<img src="${imgUrl}" alt="Sucesso" class="sucesso-img" onerror="this.src='/assets/branding/bg_content.jpg'">`;
                
                if (item.video_platform && item.video_id) {
                    if (item.video_platform === 'twitch_clip') {
                        mediaHtml += `<iframe src="https://clips.twitch.tv/embed?clip=${item.video_id}&parent=${window.location.hostname}" frameborder="0" allowfullscreen="true" scrolling="no" class="sucesso-img" style="margin-top: -1px;"></iframe>`;
                    } else if (item.video_platform === 'twitch') {
                        mediaHtml += `<iframe src="https://player.twitch.tv/?video=${item.video_id}&parent=${window.location.hostname}&autoplay=false" frameborder="0" allowfullscreen="true" scrolling="no" class="sucesso-img" style="margin-top: -1px;"></iframe>`;
                    } else if (item.video_platform === 'youtube') {
                        mediaHtml += `<iframe src="https://www.youtube.com/embed/${item.video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="sucesso-img" style="margin-top: -1px;"></iframe>`;
                    }
                }

                card.innerHTML = `
                    ${editBtnHtml}
                    ${deleteBtnHtml}
                    ${mediaHtml}
                    <div class="sucesso-content">
                        <h3 class="sucesso-title">${escapeHTML(item.title)}</h3>
                        <p class="sucesso-desc">${escapeHTML(item.description || "")}</p>
                        <div class="sucesso-meta">
                            <span><i class="fas fa-user"></i> ${escapeHTML(item.creator_username || "Sistema")}</span>
                            <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            // Adicionar eventos de exclusão e edição
            if (isStaff) {
                document.querySelectorAll('.btn-delete-sucesso').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        if (confirm("Tem certeza que deseja excluir este sucesso?")) {
                            await deleteSuccess(id);
                        }
                    });
                });

                document.querySelectorAll('.btn-edit-sucesso').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        const item = data.find(i => i.id === id);
                        if (item) {
                            openEditModal(item);
                        }
                    });
                });
            }

        } catch (e) {
            grid.innerHTML = `<div style="text-align:center; grid-column: 1/-1; color: #ff4d4d;">Erro: ${e.message}</div>`;
        }
    }

    async function deleteSuccess(id) {
        try {
            const res = await fetch(`/api/sucesso/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                loadSuccesses();
            } else {
                alert("Erro: " + data.error);
            }
        } catch (e) {
            alert("Erro de conexão");
        }
    }

    // Modal
    let currentEditId = null;

    function openEditModal(item) {
        currentEditId = item.id;
        document.querySelector(".modal-title").textContent = "Editar Sucesso";
        document.getElementById("suc-title").value = item.title;
        document.getElementById("suc-desc").value = item.description || "";
        document.getElementById("suc-image").value = item.image_url || "";
        document.getElementById("suc-video").value = item.video_url || "";
        modal.style.display = "flex";
    }

    document.getElementById("card-add-sucesso")?.addEventListener("click", () => {
        currentEditId = null;
        document.querySelector(".modal-title").textContent = "Registrar Novo Sucesso";
        form.reset();
        modal.style.display = "flex";
    });

    btnCloseModal.addEventListener("click", () => { modal.style.display = "none"; form.reset(); currentEditId = null; });
    window.addEventListener("click", (e) => { if (e.target === modal) { modal.style.display = "none"; form.reset(); currentEditId = null; } });

    // Submit form
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("suc-title").value;
        const description = document.getElementById("suc-desc").value;
        const image_url = document.getElementById("suc-image").value;
        const video_url = document.getElementById("suc-video").value;

        try {
            const url = currentEditId ? `/api/sucesso/${currentEditId}` : "/api/sucesso";
            const method = currentEditId ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, image_url, video_url })
            });
            const data = await res.json();

            if (res.ok) {
                modal.style.display = "none";
                form.reset();
                loadSuccesses();
            } else {
                alert("Erro: " + data.error);
            }
        } catch (err) {
            alert("Erro de conexão ao salvar.");
        }
    });

    // Helpers
    function escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }

    // Initialize
    loadSuccesses();
});
