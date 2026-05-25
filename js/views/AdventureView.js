(function (root) {
  "use strict";

  const AdventureView = {
    renderGrid(adventures, container) {
      if (!container) return;
      if (adventures.length === 0) {
        container.innerHTML = '<p class="mural-empty">Nenhuma aventura publicada ainda.</p>';
        return;
      }
      container.innerHTML = adventures.map(a => `
        <div class="mural-card" data-adventure-id="${a.id}" style="cursor: pointer;">
          ${a.image_url ? `<img src="${this.escapeHtml(a.image_url)}" alt="${this.escapeHtml(a.title)}" style="width:100%; height:150px; object-fit:cover; border-radius:8px 8px 0 0;">` : ""}
          <div style="padding: 10px;">
            <h3>${this.escapeHtml(a.title)}</h3>
            <p>${this.escapeHtml(a.author)}</p>
            <small>${a.event_date}</small>
          </div>
        </div>
      `).join("");
    },

    escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.AdventureView = AdventureView;
})(window);
