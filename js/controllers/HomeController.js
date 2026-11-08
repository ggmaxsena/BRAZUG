(function () {
  "use strict";

  const HomeController = {
    async init() {
      const role = localStorage.getItem("brazug_admin_role");
      const token = localStorage.getItem("brazug_admin_token");
      
      const agendaContainer = document.getElementById("agenda-container");
      const agendaImg = document.getElementById("agenda-img");
      const adminActions = document.getElementById("agenda-admin-actions");
      const updateBtn = document.getElementById("btn-update-agenda");

      try {
        // Carregar agenda atual
        const res = await fetch("/api/admin/settings/weekly_agenda");
        const data = await res.json();
        const isManagement = ["admin", "guildmaster"].includes(role);
        const agendaTitle = agendaContainer.querySelector('.section-title');

        const showMissingAgenda = (titleText) => {
            agendaImg.style.display = "none";
            if (!isManagement) {
                agendaContainer.style.display = "none";
                return;
            }
            agendaContainer.style.display = "block";
            if (agendaTitle) agendaTitle.textContent = titleText;
        };

        agendaImg.onerror = () => showMissingAgenda("Agenda da Semana (Imagem indisponível)");

        if (data.value) {
            // Evita um <img> quebrado quando o arquivo foi removido do servidor.
            const imageExists = await fetch(data.value, { method: "HEAD", cache: "no-store" })
                .then((r) => r.ok)
                .catch(() => false);

            if (imageExists) {
                agendaImg.src = data.value;
                agendaImg.style.display = "block";
                agendaContainer.style.display = "block";
            } else {
                showMissingAgenda("Agenda da Semana (Imagem indisponível)");
            }
        } else if (isManagement) {
            // Se for admin/gm e não tiver agenda, mostra o container com texto de aviso
            showMissingAgenda("Agenda da Semana (Vazio)");
        } else {
            // Usuário comum sem agenda: esconde tudo
            agendaContainer.style.display = "none";
        }

        // Mostrar ações administrativas (botão)
        if (isManagement) {
            adminActions.style.display = "block";
            updateBtn.onclick = () => this.updateAgenda(token);
        } else {
            adminActions.style.display = "none";
        }
        
        // Mostrar botão Nova Aventura (aprovado para membros)
        const btnNovaAventura = document.getElementById('btn-nova-aventura');
        if (token && btnNovaAventura) {
            btnNovaAventura.style.display = "inline-block";
        }

      } catch (e) {
        console.error("Erro ao carregar agenda:", e);
      }

      // Carregar Termômetro Global
      try {
        const statsRes = await fetch("/api/brazug/global-stats");
        if (statsRes.ok) {
            const stats = await statsRes.json();
            const vanillaStats = stats?.data?.vanilla;
            if (vanillaStats) {
                const el24h = document.getElementById("gs-24h");
                const el7d = document.getElementById("gs-7d");
                const elTotal = document.getElementById("gs-total");
                
                if (el24h) el24h.textContent = vanillaStats.deaths24h.toLocaleString('pt-BR');
                if (el7d) el7d.textContent = vanillaStats.deaths7d.toLocaleString('pt-BR');
                if (elTotal) elTotal.textContent = vanillaStats.total.toLocaleString('pt-BR');
            }
        }
      } catch (e) {
        console.error("Erro ao carregar global stats:", e);
      }
    },

    async updateAgenda(token) {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/jpeg,image/png,image/webp,image/gif";
        
        fileInput.onchange = async () => {
            const file = fileInput.files[0];
            if (!file) return;

            const allowedTypes = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif"];
            if (!allowedTypes.includes(file.type)) {
                alert("Formato inválido. Envie uma imagem JPG, PNG, WEBP ou GIF.");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert("Imagem muito grande. O limite é 5 MB.");
                return;
            }

            const formData = new FormData();
            formData.append("image", file);

            try {
                // 1. Upload do arquivo
                const uploadRes = await fetch("/api/admin/upload", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + token },
                    body: formData // Contém o campo 'image' que o multer espera
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || "Upload falhou");

                // 2. Salvar URL nas configurações
                const saveRes = await fetch("/api/admin/settings/weekly_agenda", {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ value: uploadData.url })
                });
                if (!saveRes.ok) throw new Error("Falha ao salvar configuração");

                alert("Agenda atualizada com sucesso!");
                location.reload();
            } catch (e) {
                alert(e.message);
            }
        };

        fileInput.click();
    }
  };

  document.addEventListener("DOMContentLoaded", () => HomeController.init());
})();
