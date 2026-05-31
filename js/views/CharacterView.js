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
        <div class="hero-card ${c.is_dead ? 'dead' : ''}">
          ${c.image_url ? `<img src="${this.escape(c.image_url)}" class="mural-card-img" alt="${this.escape(c.name)}">` : ""}
            <div class="mural-card-body">
            <h3 class="mural-card-title">${this.escape(c.name)}</h3>
            <p class="mural-card-text">${this.escape(c.class || "Sem classe")} - Lvl ${c.is_dead ? (c.death_level || c.level) : c.level}</p>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
              <button class="discord-btn" style="border:none; width:100%; cursor:pointer; background: var(--gold); color: #000;" onclick="CharacterController.view('${c.id}')">Ver Ficha Pública</button>
              <a href="/armory/${c.realm || 'doomhowl'}/${c.name.toLowerCase()}" class="discord-btn" style="border:none; width:100%; cursor:pointer; background: #333; color: #fff; text-decoration: none; text-align: center; line-height: 1.2; display: flex; align-items: center; justify-content: center; font-size: 13px;">Ver Armory 3D</a>
              ${canEdit ? `<button class="discord-btn" style="border:none; width:100%; cursor:pointer;" onclick="CharacterController.edit('${c.id}')">Editar</button>` : ""}
              ${isAdmin ? `<button class="discord-btn" style="border:none; width:100%; cursor:pointer; background: #cc0000;" onclick="CharacterController.deleteCharacter('${c.id}')">Excluir</button>` : ""}
            </div>
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
