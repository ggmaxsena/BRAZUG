(function () {
  "use strict";

  const AdventureController = {
    async init() {
      const container = document.getElementById("mural-grid");
      const statusEl = document.getElementById("mural-status");
      const trigger = document.querySelector(".js-long-press");
      
      if (!container) return;

      try {
        let adventures = await AdventureModel.fetchAll();
        AdventureView.renderGrid(adventures, container);

        // Garantir visibilidade
        container.hidden = false;
        if (statusEl) statusEl.hidden = true;

        // Click trigger for shadow
        let clickCount = 0;
        let lastClickTime = 0;

        if (trigger) {
          trigger.addEventListener("click", async () => {
            const now = Date.now();
            if (now - lastClickTime > 2000) clickCount = 0;
            clickCount++;
            lastClickTime = now;

            if (clickCount >= 5) {
              clickCount = 0;
              const password = prompt("As sombras pedem sua senha:");
              if (password === "destino das sombras") {
                const shadowAdventures = await AdventureModel.fetchAll("que as sombras mostram meu destino");
                adventures = shadowAdventures; 
                AdventureView.renderGrid(adventures, container);
              }
            }
          });
        }

        container.addEventListener("click", (e) => {
          const card = e.target.closest(".mural-card");
          if (!card) return;
          const id = card.getAttribute("data-adventure-id");
          const adventure = adventures.find(a => a.id == id);
          if (adventure) this.openModal(adventure);
        });
      } catch (e) {
        console.error("Erro ao inicializar mural:", e);
        if (statusEl) statusEl.textContent = "Erro ao carregar mural.";
      }
    },

    openModal(adventure) {
      const modal = document.getElementById("mural-modal");
      if (!modal) return;
      
      const img = document.getElementById("mural-modal-img");
      if (img) {
          img.src = adventure.image_url || "";
          img.style.display = adventure.image_url ? "block" : "none";
      }
      
      document.getElementById("mural-modal-title").textContent = adventure.title;
      document.getElementById("mural-modal-body").textContent = adventure.body;
      document.getElementById("mural-modal-date").textContent = adventure.event_date;
      document.getElementById("mural-modal-author").textContent = "Relato de: " + adventure.author;
      
      modal.hidden = false;

      const close = () => modal.hidden = true;
      modal.querySelectorAll("[data-action='close']").forEach(btn => btn.onclick = close);
      const backdrop = modal.querySelector(".mural-modal-backdrop");
      if (backdrop) backdrop.onclick = close;
    }
  };

  document.addEventListener("DOMContentLoaded", () => AdventureController.init());
})();
