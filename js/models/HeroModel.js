(function (root) {
  "use strict";

  const HeroModel = {
    async fetchAll() {
      const res = await fetch("/api/characters");
      if (!res.ok) throw new Error("Erro ao buscar personagens");
      return await res.json();
    }
  };

  root.HeroModel = HeroModel;
})(window);
