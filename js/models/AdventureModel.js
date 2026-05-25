(function (root) {
  "use strict";

  const AdventureModel = {
    async fetchAll(shadowKey = "") {
      const url = shadowKey 
        ? `/api/adventures?shadow=${encodeURIComponent(shadowKey)}` 
        : "/api/adventures";
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao buscar aventuras");
      const data = await res.json();
      return data.adventures || [];
    },

    async delete(id, token) {
      const res = await fetch(`/api/admin/adventures/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Falha ao excluir aventura");
      return true;
    }
  };

  root.AdventureModel = AdventureModel;
})(window);
