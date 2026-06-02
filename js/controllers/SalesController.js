(function (root) {
  "use strict";

  const SalesController = {
    async init() {
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('character_id');
      if (!characterId) return alert("Personagem não definido.");

      this.characterId = characterId;
      
      // Carregamento inicial vazio
      document.getElementById("btn-create-sale").onclick = () => this.createSale();
      
      // Filter listeners - agora chamam a busca agrupada
      document.getElementById("btn-search").onclick = () => this.loadGroupedItems();

      // Item search listener
      document.getElementById("btn-search-item").onclick = () => this.searchItems(document.getElementById("item_name").value);
      
      // Preço unitário listener
      document.getElementById("price").oninput = () => this.updatePricePreview();
      document.getElementById("quantity").oninput = () => this.updatePricePreview();
    },

    escape(s) {
        if (!s) return "";
        const d = document.createElement("div");
        d.textContent = String(s);
        return d.innerHTML;
    },

    updatePricePreview() {
        const total = parseFloat(document.getElementById("price").value) || 0;
        const qty = parseFloat(document.getElementById("quantity").value) || 1;
        const unit = total / qty;
        
        const preview = document.getElementById("price-preview");
        if (total > 0 && qty > 0) {
            preview.innerText = `Preço unitário: ${Math.floor(unit)}g`;
        } else {
            preview.innerText = "";
        }
    },

    async searchItems(query) {
        const resultsDiv = document.getElementById("item_search_results");
        if (query.length < 2) { resultsDiv.style.display = 'none'; return; }
        
        try {
            const url = `/api/sales/items/search?name=${encodeURIComponent(query)}`;
            console.log("Fetching:", url);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const items = await res.json();
            
            console.log("Results:", items);
            
            if (!Array.isArray(items)) throw new Error("Result is not an array");
            
            if (items.length === 0) {
                resultsDiv.innerHTML = '<div style="padding:10px; color:#888;">Nenhum item encontrado.</div>';
                resultsDiv.style.display = 'block';
                return;
            }
            
            resultsDiv.innerHTML = items.map(i => `
                <div class="result-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #333; display:flex; justify-content:space-between;" 
                     onmouseover="this.style.background='#222'" onmouseout="this.style.background='transparent'"
                     onclick="SalesController.selectItem(${i.id}, '${this.escape(i.name)}')">
                    <span>${this.escape(i.name)}</span>
                    <span style="font-size:11px; color:var(--gold);">${this.escape(i.quality || '')}</span>
                </div>
            `).join("");
            resultsDiv.style.display = 'block';
        } catch(e) { 
            console.error("Search error:", e); 
            resultsDiv.innerHTML = `<div style="padding:10px; color:var(--horde-red);">Erro: ${this.escape(e.message)}</div>`;
            resultsDiv.style.display = 'block';
        }
    },

    selectItem(id, name) {
        document.getElementById("item_id").value = id;
        document.getElementById("item_name").value = name;
        document.getElementById("item_search_results").style.display = 'none';

        // Habilitar campos
        document.getElementById("price").disabled = false;
        document.getElementById("price").style.background = "#0d0d0d";
        document.getElementById("price").style.color = "#fff";
        document.getElementById("price").style.cursor = "text";

        document.getElementById("quantity").disabled = false;
        document.getElementById("quantity").style.background = "#0d0d0d";
        document.getElementById("quantity").style.color = "#fff";
        document.getElementById("quantity").style.cursor = "text";

        document.getElementById("duration").disabled = false;
        document.getElementById("duration").style.background = "#0d0d0d";
        document.getElementById("duration").style.color = "#fff";
        document.getElementById("duration").style.cursor = "pointer";

        const btn = document.getElementById("btn-create-sale");
        btn.disabled = false;
        btn.style.background = "var(--gold)";
        btn.style.color = "#000";
        btn.style.cursor = "pointer";
    },

    async loadGroupedItems() {
      const filters = {
        name: document.getElementById("filter_name").value,
        min_lvl: document.getElementById("min_lvl")?.value,
        max_lvl: document.getElementById("max_lvl")?.value,
        quality: document.getElementById("filter_quality").value,
        category: document.getElementById("filter_category").value
      };
      
      try {
        const query = new URLSearchParams(filters).toString();
        const res = await fetch(`/api/sales/search-items?${query}`);
        const items = await res.json();
        this.renderGroupedItems(items);
      } catch (e) {
        console.error(e);
      }
    },

    renderGroupedItems(items) {
        const container = document.getElementById("sales-container");
        
        if (items.length === 0) {
            container.innerHTML = "<p>Nenhum item encontrado.</p>";
            return;
        }

        container.innerHTML = items.map(i => `
            <div class="sales-item" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="SalesController.loadAuctionDetails('${i.item_id}')">
                <div>
                    <strong>${this.escape(i.item_name)}</strong>
                    <div style="font-size:12px; color:#888;">${i.total_listings} anúncios | ${i.total_available} unidades</div>
                </div>
                <div style="font-weight:bold; color: var(--gold);">Menor: ${Math.floor(i.min_price_unit)}g</div>
            </div>
        `).join("");
    },

    async loadAuctionDetails(itemId) {
        try {
            const res = await fetch(`/api/sales?item_id=${itemId}`);
            const auctions = await res.json();
            
            // Para cada leilão, carregar os lances
            for (let a of auctions) {
                const bRes = await fetch(`/api/sales/${a.id}/bids`);
                a.bids = await bRes.json();
            }
            
            this.renderAuctionDetails(auctions);
        } catch (e) {
            console.error(e);
        }
    },

    renderAuctionDetails(auctions) {
        const container = document.getElementById("sales-container");
        
        container.innerHTML = `
            <button onclick="SalesController.loadGroupedItems()" style="margin-bottom:10px;">« Voltar para Busca</button>
            <div class="results-header" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 2fr; padding: 5px; border-bottom: 1px solid var(--border); font-weight: bold; margin-bottom: 10px;">
                <span>Vendedor</span>
                <span>Qtd</span>
                <span>Lance Max</span>
                <span>Ação</span>
                <span>Histórico</span>
            </div>
            ${auctions.map(a => `
                <div class="sales-item" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr 2fr; padding: 5px;">
                    <span>${this.escape(a.character_id)}</span>
                    <span>${a.quantity}</span>
                    <span style="color: var(--gold);">${a.bids.length > 0 ? a.bids[0].amount + 'g' : 'Sem lances'}</span>
                    <button onclick="SalesController.placeBid('${a.id}')">Dar Lance</button>
                    <div style="font-size:10px;">${a.bids.map(b => this.escape(b.bidder_name) + ': ' + b.amount + 'g').join(', ')}</div>
                </div>
            `).join("")}
        `;
    },

    async placeBid(saleId) {
        const amount = prompt("Digite o valor do seu lance:");
        if (!amount || isNaN(amount)) return;

        const token = localStorage.getItem("brazug_admin_token");
        try {
            const res = await fetch(`/api/sales/${saleId}/bids`, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bidder_character_id: this.characterId,
                    amount: parseInt(amount)
                })
            });
            if (!res.ok) throw new Error("Erro ao dar lance. Verifique se o valor é maior que o lance anterior.");
            alert("Lance efetuado com sucesso!");
            // Opcional: Recarregar detalhes para atualizar o lance máximo
        } catch (e) {
            alert(e.message);
        }
    },

    showPreview(title, desc) {
        const preview = document.getElementById("item-preview");
        document.getElementById("preview-title").innerText = title;
        document.getElementById("preview-desc").innerText = desc;
        preview.style.display = 'block';
    },

    hidePreview() {
        document.getElementById("item-preview").style.display = 'none';
    },

    async createSale() {
      const token = localStorage.getItem("brazug_admin_token");
      const sale = {
        character_id: this.characterId,
        item_id: document.getElementById("item_id").value || null,
        item_name: document.getElementById("item_name").value,
        price: document.getElementById("price").value,
        quantity: document.getElementById("quantity").value,
        duration_hours: document.getElementById("duration").value
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
