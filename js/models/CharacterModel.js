(function (root) {
  "use strict";

  const CharacterModel = {
    async fetchAll(token) {
      const res = await fetch("/api/characters", {
        headers: token ? { "Authorization": "Bearer " + token } : {}
      });
      if (!res.ok) throw new Error("Erro ao buscar fichas");
      const data = await res.json();
      return Array.isArray(data) ? data : data.characters || [];
    },

    async fetchById(id, token = null) {
      const res = await fetch(`/api/characters/${id}`, {
        headers: token ? { "Authorization": "Bearer " + token } : {}
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ficha não encontrada");
      return data;
    },

    async search(name) {
      const res = await fetch(`/api/characters/search?name=${encodeURIComponent(name)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ficha não encontrada");
      return data;
    },

    async fetchWoWCharacter(realm, name) {
      const res = await fetch(`/api/character/fetch/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Personagem não encontrado na Blizzard. Verifique o nome e se o herói é nível 10+.");
      return data;
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Erro ao salvar ficha");
      return data;
    },

    async delete(id, token) {
      const res = await fetch(`/api/characters/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao excluir personagem");
      return data;
    },

    async uploadImage(token, file) {
      const upData = new FormData();
      upData.append("image", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: upData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload falhou");
      return data;
    },

    async fetchReputation(characterId, token = null) {
      const res = await fetch(`/api/sales/reputation/${characterId}`, {
        headers: token ? { "Authorization": "Bearer " + token } : {}
      });
      if (!res.ok) return null;
      return await res.json();
    }
  };

  root.CharacterModel = CharacterModel;
})(window);
