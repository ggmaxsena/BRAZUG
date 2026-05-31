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
        <div class="card stream-card-container">
          <a href="${s.url}" target="_blank" style="text-decoration:none; color:inherit;">
            <div style="position: relative;">
                <img src="${this.escape(s.thumbnailUrl)}" class="mural-card-img" alt="Preview">
                <span style="position: absolute; top: 10px; left: 10px; background: rgba(255,0,0,0.8); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ● AO VIVO
                </span>
                <span style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                    ${s.viewers} espectadores
                </span>
            </div>
            <div class="mural-card-body">
                <h3 class="mural-card-title">${this.escape(s.displayName)}</h3>
                <p class="mural-card-text" style="font-size: 14px; color: #ccc;">${this.escape(s.title)}</p>
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
