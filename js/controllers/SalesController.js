(function (root) {
  "use strict";

  const SalesController = {
    async init() {
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('character_id');
      if (!characterId) return alert("Personagem não definido.");

      this.characterId = characterId;
      await this.loadSales();

      document.getElementById("btn-create-sale").onclick = () => this.createSale();
    },

    async loadSales() {
      try {
        const res = await fetch(`/api/sales/${this.characterId}`);
        const sales = await res.json();
        const container = document.getElementById("sales-container");
        
        if (sales.length === 0) {
            container.innerHTML = "<p>Nenhum item anunciado ainda.</p>";
            return;
        }

        container.innerHTML = sales.map(s => `
            <div style="background:#1a1a1a; padding:10px; margin-bottom:10px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${s.item_name}</strong> - ${s.price}
                    <div style="font-size:12px; color:#888;">${s.description || ''}</div>
                </div>
                <button class="discord-btn" style="background:#cc0000; padding:5px 10px; cursor:pointer;" onclick="SalesController.deleteSale('${s.id}')">Excluir</button>
            </div>
        `).join("");
      } catch (e) {
        console.error(e);
      }
    },

    async createSale() {
      const token = localStorage.getItem("brazug_admin_token");
      const sale = {
        character_id: this.characterId,
        item_name: document.getElementById("item_name").value,
        price: document.getElementById("price").value,
        description: document.getElementById("description").value
      };

      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { 
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(sale)
        });
        if (!res.ok) throw new Error("Erro ao criar anúncio");
        alert("Anúncio criado!");
        location.reload();
      } catch (e) {
        alert(e.message);
      }
    },

    async deleteSale(id) {
        const token = localStorage.getItem("brazug_admin_token");
        try {
            const res = await fetch(`/api/sales/${id}`, {
                method: "DELETE",
                headers: { "Authorization": "Bearer " + token }
            });
            if (!res.ok) throw new Error("Erro ao excluir");
            location.reload();
        } catch (e) {
            alert(e.message);
        }
    }
  };

  root.SalesController = SalesController;
  document.addEventListener("DOMContentLoaded", () => SalesController.init());
})(window);
