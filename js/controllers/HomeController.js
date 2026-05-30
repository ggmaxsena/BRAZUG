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
        
        if (data.value) {
            agendaImg.src = data.value;
            agendaImg.style.display = "block";
            agendaContainer.style.display = "block";
        } else if (isManagement) {
            // Se for admin/gm e não tiver agenda, mostra o container com texto de aviso
            agendaContainer.style.display = "block";
            agendaImg.style.display = "none";
            const title = agendaContainer.querySelector('.section-title');
            if (title) title.textContent = "Agenda da Semana (Vazio)";
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
    },

    async updateAgenda(token) {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        
        fileInput.onchange = async () => {
            const file = fileInput.files[0];
            if (!file) return;

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
