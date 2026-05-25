(function (root) {
  "use strict";

  const HeroController = {
    async init() {
      try {
        const characters = await HeroModel.fetchAll();
        HeroView.renderGrid(characters);
      } catch (e) {
        console.error("Erro ao carregar heróis:", e);
      }
    },

    select(id) {
      window.location.href = `/personagem.html?id=${id}`;
    }
  };

  root.HeroController = HeroController;
  document.addEventListener("DOMContentLoaded", () => HeroController.init());
})(window);
