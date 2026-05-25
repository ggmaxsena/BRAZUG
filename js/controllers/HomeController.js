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
        
        if (data.value) {
            agendaImg.src = data.value;
            agendaContainer.style.display = "block";
        } else if (["admin", "guildmaster"].includes(role)) {
            // Se for admin/gm e não tiver agenda, mostra o container para ele poder colocar
            agendaContainer.style.display = "block";
            agendaImg.style.display = "none";
        }

        // Mostrar ações administrativas
        if (["admin", "guildmaster"].includes(role)) {
            adminActions.style.display = "block";
            updateBtn.onclick = () => this.updateAgenda(token);
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
                    body: formData
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
