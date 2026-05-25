(function () {
  "use strict";

  const AdventureController = {
    async init() {
      const container = document.getElementById("mural-grid");
      const trigger = document.querySelector(".js-long-press");
      
      try {
        const adventures = await AdventureModel.fetchAll();
        AdventureView.renderGrid(adventures, container);

        // Click trigger for shadow
        let clickCount = 0;
        let lastClickTime = 0;

        trigger.addEventListener("click", async () => {
          const now = Date.now();
          if (now - lastClickTime > 2000) { 
            clickCount = 0;
          }
          clickCount++;
          lastClickTime = now;
          console.log("Shadow clicks:", clickCount);

          if (clickCount >= 5) {
            clickCount = 0;
            console.log("Shadow trigger activated!");
            const password = prompt("As sombras pedem sua senha:");
            if (password === "destino das sombras") {
              const shadowAdventures = await AdventureModel.fetchAll("que as sombras mostram meu destino");
              AdventureView.renderGrid(shadowAdventures, container);
            }
          }
        });

        container.addEventListener("click", (e) => {
          const card = e.target.closest(".mural-card");
          if (!card) return;
          const id = card.getAttribute("data-adventure-id");
          const adventure = adventures.find(a => a.id == id);
          if (adventure) this.openModal(adventure);
        });
      } catch (e) {
        console.error("Erro ao inicializar mural:", e);
      }
    },

    openModal(adventure) {
      const modal = document.getElementById("mural-modal");
      if (!modal) return;
      document.getElementById("mural-modal-img").src = adventure.image_url || "";
      document.getElementById("mural-modal-title").textContent = adventure.title;
      document.getElementById("mural-modal-body").textContent = adventure.body;
      document.getElementById("mural-modal-date").textContent = adventure.event_date;
      document.getElementById("mural-modal-author").textContent = adventure.author;
      modal.hidden = false;

      // Close logic
      const close = () => modal.hidden = true;
      modal.querySelector("[data-action='close']").onclick = close;
      modal.querySelector(".mural-modal-backdrop").onclick = close;
    }
  };

  document.addEventListener("DOMContentLoaded", () => AdventureController.init());
})();
