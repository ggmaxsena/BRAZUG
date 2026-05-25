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
      return `
        <div class="hero-card" style="cursor: pointer;" onclick="HeroController.select('${c.id}')">
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
