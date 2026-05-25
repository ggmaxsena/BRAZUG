(function (root) {
  "use strict";

  const CharacterView = {
    renderList(chars, container, currentUsername, role) {
      if (!container) return;
      const isAdmin = role === 'admin';
      
      container.innerHTML = chars.map(c => {
        const isOwner = c.owner_username === currentUsername;
        const canEdit = isAdmin || isOwner;
        
        return `
        <div class="hero-card">
          ${c.image_url ? `<img src="${this.escape(c.image_url)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px 4px 0 0;" alt="${this.escape(c.name)}">` : ""}
          <div style="padding: 10px;">
            <h3>${this.escape(c.name)}</h3>
            <p>${this.escape(c.class || "Sem classe")}</p>
            ${canEdit ? `<button class="btn-small" onclick="CharacterController.edit('${c.id}')">Editar</button>` : ""}
          </div>
        </div>
      `;
      }).join("");
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.CharacterView = CharacterView;
})(window);
