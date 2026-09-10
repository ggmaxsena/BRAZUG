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
                if (isStaff) {
                    deleteBtnHtml = `<button class="btn-delete-sucesso" data-id="${item.id}" style="display:block;" title="Excluir"><i class="fas fa-trash"></i></button>`;
                }

                let mediaHtml = '';
                const imgUrl = item.image_url || '/assets/branding/bg_content.jpg';
                mediaHtml += `<img src="${imgUrl}" alt="Sucesso" class="sucesso-img" onerror="this.src='/assets/branding/bg_content.jpg'">`;
                
                if (item.video_platform && item.video_id) {
                    if (item.video_platform === 'twitch_clip') {
                        mediaHtml += `<iframe src="https://clips.twitch.tv/embed?clip=${item.video_id}&parent=${window.location.hostname}" frameborder="0" allowfullscreen="true" scrolling="no" class="sucesso-img" style="margin-top: -1px;"></iframe>`;
                    } else if (item.video_platform === 'youtube') {
                        mediaHtml += `<iframe src="https://www.youtube.com/embed/${item.video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="sucesso-img" style="margin-top: -1px;"></iframe>`;
                    }
                }

                card.innerHTML = `
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

            // Adicionar eventos de exclusão
            if (isStaff) {
                document.querySelectorAll('.btn-delete-sucesso').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        if (confirm("Tem certeza que deseja excluir este sucesso?")) {
                            await deleteSuccess(id);
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
    btnCloseModal.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    // Submit form
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("suc-title").value;
        const description = document.getElementById("suc-desc").value;
        const image_url = document.getElementById("suc-image").value;
        const video_url = document.getElementById("suc-video").value;

        try {
            const res = await fetch("/api/sucesso", {
                method: "POST",
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
