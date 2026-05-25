(function (root) {
  "use strict";

  const CharacterModel = {
    async fetchAll(token) {
      const res = await fetch("/api/characters", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) throw new Error("Erro ao buscar fichas");
      return await res.json();
    },

    async save(character, token, id = null) {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/characters/${id}` : "/api/characters";
      const res = await fetch(url, {
        method: method,
        headers: { 
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(character)
      });
      if (!res.ok) throw new Error("Erro ao salvar ficha");
      return await res.json();
    },

    async delete(id, token) {
      const res = await fetch(`/api/characters/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      return res.ok;
    }
  };

  root.CharacterModel = CharacterModel;
})(window);
