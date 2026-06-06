(function (root) {
  "use strict";

  const AdventureView = {
    renderGrid(adventures, container) {
      if (!container) return;
      if (adventures.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Nenhuma aventura publicada ainda.</p>';
        return;
      }
      container.innerHTML = adventures.map(a => `
        <div class="mural-card" data-adventure-id="${a.id}" style="cursor: pointer;">
          ${a.image_url ? `<img src="${this.escapeHtml(a.image_url)}" class="mural-card-img" alt="${this.escapeHtml(a.title)}">` : ""}
          <div class="mural-card-body">
            <div class="mural-card-meta">${this.escapeHtml(a.event_date)}</div>
            <h3 class="mural-card-title">${this.escapeHtml(a.title)}</h3>
            <p class="mural-card-text">Por: ${this.escapeHtml(a.author)}</p>
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
