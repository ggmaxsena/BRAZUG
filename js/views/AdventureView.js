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
        <div class="mural-card" data-adventure-id="${a.id}">
          <h3>${this.escapeHtml(a.title)}</h3>
          <p>${this.escapeHtml(a.author)}</p>
          <small>${a.event_date}</small>
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
