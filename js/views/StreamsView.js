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
        <li class="stream-item" style="list-style:none; margin-bottom: 20px;">
          <a href="${s.url}" target="_blank" style="text-decoration:none; color:inherit;">
            <img src="${this.escape(s.thumbnailUrl)}" alt="Preview" style="width:100%; border-radius:8px; margin-bottom: 5px;">
            <div style="font-weight:bold;">${this.escape(s.displayName)}</div>
            <div style="font-size:0.9em; color:#aaa;">${this.escape(s.title)}</div>
          </a>
        </li>
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
