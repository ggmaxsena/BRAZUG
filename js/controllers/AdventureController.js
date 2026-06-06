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

        // fallback: se render vier vazia, mostra mensagem
        if (adventures.length === 0 && statusEl) {
          statusEl.textContent = "Nenhuma aventura publicada ainda.";
          statusEl.hidden = false;
        }

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

  document.addEventListener("DOMContentLoaded", () => AdventureController.init());
})();
