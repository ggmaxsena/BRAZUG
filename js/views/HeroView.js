(function (root) {
  "use strict";

  const HeroView = {
    renderGrid(characters) {
      const aliveGrid = document.getElementById("heroes-alive-grid");
      const deadGrid = document.getElementById("heroes-dead-grid");
      if (!aliveGrid || !deadGrid) return;

      const alive = characters.filter(c => !c.is_dead);
      const dead = characters.filter(c => c.is_dead);

      aliveGrid.innerHTML = alive.map(c => this.createCard(c)).join("");
      deadGrid.innerHTML = dead.map(c => this.createCard(c)).join("");
    },

    createCard(c) {
      const imgHtml = c.image_url 
        ? `<img src="${this.escape(c.image_url)}" class="mural-card-img" alt="${this.escape(c.name)}">` 
        : "";
      
      const hasVideo = !!(c.video_url || (c.lore && c.lore.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv)\/[^\s<"']+/)));
      const videoIcon = hasVideo ? `<span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: var(--gold); padding: 4px 8px; border-radius: 4px; font-size: 14px; z-index: 2; border: 1px solid var(--gold);">🎥</span>` : "";

      return `
        <div class="hero-card" style="cursor: pointer; position: relative;" onclick="HeroController.select('${c.id}')">
          ${videoIcon}
          ${imgHtml}
          <div class="mural-card-body">
            <h3 class="mural-card-title">${this.escape(c.name)}</h3>
            <p class="mural-card-text">${this.escape(c.class || "")} - Lvl ${c.level || 1}</p>
          </div>
        </div>
      `;
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.HeroView = HeroView;
})(window);
