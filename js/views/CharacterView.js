(function (root) {
  "use strict";

  const CharacterView = {
    renderList(chars, container, currentUsername, role) {
      if (!container) return;
      const isAdmin = role === 'admin';
      
      container.innerHTML = chars.map(c => {
        const isOwner = c.owner_username === currentUsername;
        const canEdit = isAdmin || isOwner;
        
        const hasVideo = !!(c.video_url || (c.lore && c.lore.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv)\/[^\s<"']+/)));
        const videoBadge = hasVideo ? `<span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: var(--gold); padding: 4px 8px; border-radius: 4px; font-size: 11px; z-index: 2; border: 1px solid var(--gold); font-weight: bold;">🎥 LORE</span>` : "";

        return `
        <div class="hero-card ${c.is_dead ? 'dead' : ''}" style="position: relative;">
          ${videoBadge}
          ${c.image_url ? `<img src="${this.escape(c.image_url)}" class="mural-card-img" alt="${this.escape(c.name)}">` : ""}
            <div class="mural-card-body">
            <h3 class="mural-card-title">${this.escape(c.name)}</h3>
            <p class="mural-card-text">${this.escape(c.class || "Sem classe")} - Lvl ${c.is_dead ? (c.death_level || c.level) : c.level}</p>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
              <button class="discord-btn" style="border:none; width:100%; cursor:pointer; background: var(--gold); color: #000;" onclick="CharacterController.view('${c.id}')">Ver Ficha Pública</button>
              <a href="/armory/${c.realm || 'doomhowl'}/${c.name.toLowerCase()}" class="discord-btn" style="border:none; width:100%; cursor:pointer; background: #333; color: #fff; text-decoration: none; text-align: center; line-height: 1.2; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">Brazug Armory</a>
              ${canEdit ? `<a href="/vendas.html?character_id=${c.id}" class="discord-btn" style="border:none; width:100%; cursor:pointer; background: #4a3d28; color: var(--gold); text-decoration: none; text-align: center; line-height: 1.2; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">Comércio / Leilão</a>` : ""}
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
