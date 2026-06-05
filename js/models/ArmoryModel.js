(function (root) {
  "use strict";

  const ArmoryModel = {
    async fetchFullCharacter(realm, name) {
      const res = await fetch(`/api/armory/full/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`);
      // Status 530 is handled by the caller with retries if needed, 
      // but here we just return the response or throw on error.
      if (!res.ok) {
        if (res.status === 503) {
           return { retry: true };
        }
        throw new Error("Personagem não encontrado ou erro na API");
      }
      return await res.json();
    },

    async searchItems(query) {
      const res = await fetch(`/api/armory/items?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Erro ao buscar itens");
      return await res.json();
    },

    async getItemDetails(itemId) {
      const res = await fetch(`/api/armory/items/${itemId}`);
      if (!res.ok) throw new Error("Erro ao carregar detalhes do item");
      return await res.json();
    },

    async triggerSync(realm, name, token) {
      const res = await fetch('/api/character/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, realm, region: 'us' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar");
      return data;
    }
  };

  root.ArmoryModel = ArmoryModel;
})(window);
