(function (root) {
  "use strict";

  const CharacterView = {
    renderList(chars, container) {
      if (!container) return;
      container.innerHTML = chars.map(c => `
        <div class="hero-card" style="cursor: pointer;" onclick="CharacterController.edit('${c.id}')">
          ${c.image_url ? `<img src="${this.escape(c.image_url)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px 4px 0 0;" alt="${this.escape(c.name)}">` : ""}
          <div style="padding: 10px;">
            <h3>${this.escape(c.name)}</h3>
            <p>${this.escape(c.class || "")} - Lvl ${c.level || 1}</p>
            <button class="btn-small">Editar</button>
          </div>
        </div>
      `).join("");
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.CharacterView = CharacterView;
})(window);
