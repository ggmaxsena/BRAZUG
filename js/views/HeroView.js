(function (root) {
  "use strict";

  const HeroView = {
    renderGrid(characters) {
      const aliveGrid = document.getElementById("heroes-alive-grid");
      const deadGrid = document.getElementById("heroes-dead-grid");
      if (!aliveGrid || !deadGrid) return;

      const alive = characters.filter(c => !c.dead);
      const dead = characters.filter(c => c.dead);

      aliveGrid.innerHTML = alive.map(c => this.createCard(c)).join("");
      deadGrid.innerHTML = dead.map(c => this.createCard(c)).join("");
    },

    createCard(c) {
      const imgHtml = c.image_url 
        ? `<img src="${this.escape(c.image_url)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px 4px 0 0;" alt="${this.escape(c.name)}">` 
        : "";
      return `
        <div class="hero-card" style="cursor: pointer;" onclick="HeroController.select('${c.id}')">
          ${imgHtml}
          <div style="padding: 10px;">
            <h3>${this.escape(c.name)}</h3>
            <p>${this.escape(c.class || "")} - Lvl ${c.level || 1}</p>
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
