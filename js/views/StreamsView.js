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
        <li class="stream-item">
          <a href="${s.url}" target="_blank">
            <strong>${this.escape(s.user_name)}</strong> — ${this.escape(s.title)}
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
