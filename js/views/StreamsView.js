(function (root) {
  "use strict";

  const StreamsView = {
    renderList(streams, container, statusEl) {
      if (!container || !statusEl) return;
      
      if (streams.length === 0) {
        statusEl.textContent = "Ninguém ao vivo com <BRAZUG> no título agora.";
        return;
      }

      statusEl.hidden = true;
      container.hidden = false;
      container.innerHTML = streams.map(s => `
        <div class="card">
          <a href="${s.url}" target="_blank" style="text-decoration:none; color:inherit;">
            <img src="${this.escape(s.thumbnailUrl)}" class="mural-card-img" alt="Preview">
            <div class="mural-card-body">
                <h3 class="mural-card-title">${this.escape(s.displayName)}</h3>
                <p class="mural-card-text">${this.escape(s.title)}</p>
            </div>
          </a>
        </div>
      `).join("");
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.StreamsView = StreamsView;
})(window);
