(function (root) {
  "use strict";

  const SalesController = {
    async init() {
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('character_id');
      if (!characterId) return alert("Personagem não definido.");

      this.characterId = characterId;
      this.currentCategory = "";
      
      // Carregamento inicial
      document.getElementById("btn-create-sale").onclick = () => this.createSale();
      
      // Filter listeners
      document.getElementById("btn-search").onclick = () => this.loadGroupedItems();
      document.getElementById("btn-search-sell").onclick = () => this.searchItemsToSell();

      // Tooltip listener
      document.addEventListener('mousemove', e => {
        if (document.getElementById('tooltip').style.display === 'block') this.moveTip(e);
      });
    },

    escape(s) {
        if (!s) return "";
        const d = document.createElement("div");
        d.textContent = String(s);
        return d.innerHTML;
    },

    // Tooltip methods
    showTooltip(e, content) {
        const tt = document.getElementById('tooltip');
        tt.innerHTML = content;
        tt.style.display = 'block';
        this.moveTip(e);
    },
    moveTip(e) {
        const tt = document.getElementById('tooltip');
        tt.style.left = (e.clientX + 14) + 'px';
        tt.style.top  = (e.clientY + 14) + 'px';
    },
    hideTooltip() {
        document.getElementById('tooltip').style.display = 'none';
    },

    formatGold(copper) {
        const g = Math.floor(copper / 10000);
        const s = Math.floor((copper % 10000) / 100);
        const c = copper % 100;
        let out = '';
        if (g) out += `<span>${g}</span><span class="coin-g">g</span> `;
        if (s) out += `<span>${s}</span><span class="coin-s">s</span> `;
        if (c || !out) out += `<span>${c}</span><span class="coin-c">c</span>`;
        return `<span class="ah-gold-amount">${out}</span>`;
    },

    // Refactored with pagination
    async searchItemsToSell(page = 1) {
        console.log("searchItemsToSell called with page:", page);
        const query = document.getElementById("sell_filter_name").value;
        const container = document.getElementById("sell-items-container");
        const paginationContainer = document.getElementById("sell-pagination-container");
        
        if (query.length < 2) {
            container.innerHTML = '<div style="padding: 20px; color: var(--ah-gold);">Digite ao menos 2 caracteres.</div>';
            return;
        }
        
        container.innerHTML = '<div style="padding: 20px; color: var(--ah-gold);">Buscando...</div>';
        paginationContainer.innerHTML = '';
        
        try {
            console.log("Fetching:", `/api/sales/items/search?name=${encodeURIComponent(query)}&page=${page}`);
            const res = await fetch(`/api/sales/items/search?name=${encodeURIComponent(query)}&page=${page}`);
            const data = await res.json();
            
            // Render item list
            if (data.items.length === 0) {
                container.innerHTML = '<div style="padding: 20px; color: var(--ah-gold);">Nenhum item encontrado.</div>';
                return;
            }
            
            container.innerHTML = data.items.map(i => {
                const iconPath = i.icon_filename ? `/assets/icons/${i.icon_filename}` : '/assets/icons/inv_misc_cape_16.jpg';
                const rarityClass = `rarity-${(i.quality || 'common').toLowerCase()}`;
                return `
                <div class="ah-auction-row" style="cursor:pointer; display:grid; grid-template-columns: 1fr auto; align-items:center; padding: 5px;" onclick="SalesController.selectItemToSell(${i.id}, '${this.escape(i.name)}')">
                    <div class="ah-cell ah-cell-name" style="display:flex; align-items:center; gap: 10px;">
                        <div class="ah-item-icon" style="width:24px; height:24px;"><img src="${iconPath}"></div>
                        <span class="${rarityClass}" style="font-size:12px;">${this.escape(i.name)}</span>
                    </div>
                    <div class="ah-cell" style="text-align:right;"><button class="ah-tab" style="padding: 2px 8px; font-size:11px;">Selecionar</button></div>
                </div>
            `}).join("");

            // Render Pagination Controls in Top Bar
            paginationContainer.style.cssText = 'display:flex; gap:10px; align-items:center;';
            paginationContainer.innerHTML = `
                <button class="ah-tab" ${data.currentPage <= 1 ? 'disabled' : ''} onclick="SalesController.searchItemsToSell(${data.currentPage - 1})">«</button>
                <span style="color:var(--ah-text-gold); font-size: 11px;">${data.currentPage}/${data.totalPages}</span>
                <button class="ah-tab" ${data.currentPage >= data.totalPages ? 'disabled' : ''} onclick="SalesController.searchItemsToSell(${data.currentPage + 1})">»</button>
            `;
        } catch(e) { 
            console.error("Search error:", e);
            container.innerHTML = '<div style="padding: 20px; color: var(--horde-red);">Erro na busca.</div>';
        }
    },

    switchTab(tab) {
        // Hide all contents
        document.getElementById('tab-browse-content').style.display = 'none';
        document.getElementById('tab-auctions-content').style.display = 'none';
        document.getElementById('tab-bids-content').style.display = 'none';
        
        // Remove active class from all tabs
        document.getElementById('tab-browse').classList.remove('active');
        document.getElementById('tab-auctions').classList.remove('active');
        document.getElementById('tab-bids').classList.remove('active');
        
        // Show selected content and activate tab
        document.getElementById(`tab-${tab}-content`).style.display = 'block';
        document.getElementById(`tab-${tab}`).classList.add('active');
        
        if (tab === 'bids') this.loadNotifications();
    },

    setCategory(btn, cat) {
        document.querySelectorAll('.ah-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = cat;
        this.loadGroupedItems();
    },

    updatePricePreview() {
        const total = parseFloat(document.getElementById("price").value) || 0;
        const qty = parseFloat(document.getElementById("quantity").value) || 1;
        const unit = total / qty;
        
        const preview = document.getElementById("price-preview");
        if (total > 0 && qty > 0) {
            preview.innerHTML = `Preço unitário: ${this.formatGold(Math.floor(unit) * 10000)}`;
        } else {
            preview.innerHTML = "";
        }
    },

    async searchItems() {
        const query = document.getElementById("item_name").value;
        const resultsDiv = document.getElementById("item_search_results");
        if (query.length < 2) { 
            resultsDiv.style.display = 'none'; 
            return; 
        }
        
        try {
            const url = `/api/sales/items/search?name=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const items = await res.json();
            
            if (items.length === 0) {
                resultsDiv.innerHTML = '<div style="padding:10px; color:#888;">Nenhum item encontrado.</div>';
                resultsDiv.style.display = 'block';
                return;
            }
            
            resultsDiv.innerHTML = items.map(i => {
                const iconPath = i.icon_filename ? `/assets/icons/${i.icon_filename}` : '/assets/icons/inv_misc_cape_16.jpg';
                const rarityClass = `rarity-${(i.quality || 'common').toLowerCase()}`;
                return `
                <div class="ah-auction-row" style="cursor:pointer; border-bottom:1px solid #3a2c10;" 
                     onclick="SalesController.selectItem(${i.id}, '${this.escape(i.name)}')">
                    <div class="ah-cell ah-cell-name">
                        <div class="ah-item-icon" style="width:24px; height:24px;"><img src="${iconPath}"></div>
                        <span class="${rarityClass}" style="font-size:12px; font-weight:bold;">${this.escape(i.name)}</span>
                    </div>
                </div>
            `}).join("");
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
        const fields = ["price", "quantity", "duration"];
        fields.forEach(fid => {
            const el = document.getElementById(fid);
            el.disabled = false;
            el.style.background = "var(--ah-input-bg)";
            el.style.color = "var(--ah-text-white)";
            el.style.cursor = fid === "duration" ? "pointer" : "text";
        });

        const btn = document.getElementById("btn-create-sale");
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    },

    selectItemToSell(id, name) {
        document.getElementById("sell_item_id").value = id;
        document.getElementById("sell_item_name").value = name;

        // Habilitar campos
        ["sell_price", "sell_quantity", "btn-create-sale"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = false;
            }
        });
    },

    async loadGroupedItems() {
      const filters = {
        name: document.getElementById("filter_name").value,
        min_lvl: document.getElementById("min_lvl")?.value,
        max_lvl: document.getElementById("max_lvl")?.value,
        quality: document.getElementById("filter_quality").value,
        category: this.currentCategory
      };
      
      document.getElementById('statusText').textContent = "Buscando...";
      
      try {
        const query = new URLSearchParams(filters).toString();
        const res = await fetch(`/api/sales/search-items?${query}`);
        const data = await res.json();
        console.log("Raw response from /api/sales/search-items:", data);
        this.renderGroupedItems(data);
        document.getElementById('statusText').textContent = `Encontrado(s) ${Array.isArray(data) ? data.length : 0} item(s)`;
      } catch (e) {
        console.error("Load error:", e);
        document.getElementById('statusText').textContent = "Erro na busca";
      }
    },

    renderGroupedItems(items) {
        console.log("renderGroupedItems received:", items);
        const container = document.getElementById("sales-container");
        
        // Verificação se houve erro vindo da API
        if (items && items.error) {
            console.error("API Error:", items.error);
            container.innerHTML = `<div style="color:red; padding:20px;">Erro: ${this.escape(items.error)}</div>`;
            return;
        }
        
        if (!Array.isArray(items)) {
            console.error("renderGroupedItems expected array but got:", typeof items, items);
            container.innerHTML = '<div style="color:red; padding:20px;">Erro de formato de dados. O servidor retornou algo inesperado. Veja o console.</div>';
            return;
        }

        container.innerHTML = items.map(i => {
            const iconPath = i.icon_filename ? `/assets/icons/${i.icon_filename}` : '/assets/icons/inv_misc_cape_16.jpg';
            const rarityClass = `rarity-${(i.quality || 'common').toLowerCase()}`;
            
            return `
            <div class="ah-auction-row" onclick="SalesController.loadAuctionDetails('${i.item_id}')">
                <div class="ah-cell ah-cell-name">
                    <div class="ah-item-icon"><img src="${iconPath}"></div>
                    <span class="${rarityClass}">${this.escape(i.item_name)}</span>
                </div>
                <div class="ah-cell">${i.min_lvl || ''}</div>
                <div class="ah-cell" style="color:var(--ah-text-dim)">--</div>
                <div class="ah-cell" style="color:var(--ah-text-dim)">Múltiplos</div>
                <div class="ah-cell">${this.formatGold(Math.floor(i.min_price_unit))}</div>
                <div class="ah-cell"><button class="ah-tab" style="padding:2px 8px; font-size:10px; height:auto;" onclick="event.stopPropagation(); SalesController.loadAuctionDetails('${i.item_id}')">Ver Todos</button></div>
            </div>
        `}).join("");
    },

    async loadNotifications() {
        const token = localStorage.getItem("brazug_admin_token");
        const container = document.getElementById("notifications-container");
        container.innerHTML = '<div style="padding:20px; color:var(--ah-gold);">Carregando...</div>';

        try {
            const res = await fetch("/api/sales/notifications", {
                headers: { "Authorization": "Bearer " + token }
            });
            const notifications = await res.json();
            this.renderNotifications(notifications);
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div style="padding:20px; color:red;">Erro ao carregar notificações.</div>';
        }
    },

    renderNotifications(notifications) {
        const container = document.getElementById("notifications-container");
        
        if (notifications.length === 0) {
            container.innerHTML = '<div style="padding:20px; color:var(--ah-gold);">Nenhuma notificação recente.</div>';
            return;
        }

        container.innerHTML = notifications.map(n => `
            <div class="ah-auction-row" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
                <div class="ah-cell"><strong>${this.escape(n.item_name)}</strong></div>
                <div class="ah-cell">${this.escape(n.bidder_name)}</div>
                <div class="ah-cell">${this.formatGold(n.amount * 10000)}</div>
                <div class="ah-cell" style="font-size: 10px; color: var(--ah-text-dim);">${new Date(n.created_at).toLocaleString()}</div>
            </div>
        `).join("");
    },

    async loadAuctionDetails(itemId) {
        try {
            this.lastItemId = itemId;
            console.log("Fetching auctions for item:", itemId);
            const res = await fetch(`/api/sales?item_id=${itemId}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const auctions = await res.json();
            console.log("Auctions received:", auctions);
            
            // Para cada leilão, carregar os lances
            console.log("Auctions loop:", auctions);
            for (let a of auctions) {
                console.log("Fetching bids for sale ID:", a.id);
                if (!a.id) {
                    console.error("Auction missing ID:", a);
                    continue;
                }
                const bRes = await fetch(`/api/sales/${a.id}/bids`);
                if (!bRes.ok) throw new Error(`HTTP error! status: ${bRes.status}`);
                a.bids = await bRes.json();
            }
            
            this.renderAuctionDetails(auctions);
        } catch (e) {
            console.error("Error in loadAuctionDetails:", e);
            alert("Erro ao carregar detalhes do leilão.");
        }
    },

    renderAuctionDetails(auctions) {
        const container = document.getElementById("sales-container");
        
        container.innerHTML = `
            <div style="padding: 10px; border-bottom: 1px solid var(--ah-panel-border); background: rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center;">
                <button class="ah-tab" onclick="SalesController.loadGroupedItems()" style="height:auto; padding:5px 15px;">« Voltar</button>
                <span style="font-size:14px; color:var(--ah-gold-bright); font-weight:bold;">Detalhes do Item</span>
            </div>
            <div class="ah-col-headers" style="display: grid; grid-template-columns: 2fr 1fr 2fr 1fr; gap: 10px; padding: 10px; background: rgba(0,0,0,0.2);">
                <div class="ah-col-hdr">Vendedor</div>
                <div class="ah-col-hdr">Qtd</div>
                <div class="ah-col-hdr">Preço</div>
                <div class="ah-col-hdr">Ação</div>
            </div>
            ${auctions.filter(a => a.status === 'open').map(a => `
                <div class="ah-auction-row" style="display: grid; grid-template-columns: 2fr 1fr 2fr 1fr; gap: 10px; padding: 10px; border-bottom: 1px solid var(--ah-panel-border); align-items: center;">
                    <div class="ah-cell">${this.escape(a.seller_name || 'Desconhecido')}</div>
                    <div class="ah-cell">${a.quantity}</div>
                    <div class="ah-cell" style="color: var(--ah-gold-bright); font-weight: bold;">${this.formatGold(a.price)}</div>
                    <div class="ah-cell">
                        <button class="ah-tab" style="padding:5px 15px; font-size:12px; cursor:pointer;" onclick="SalesController.purchaseItem('${a.id}')">Arrematar</button>
                    </div>
                </div>
            `).join("")}
        `;
    },

    async purchaseItem(saleId) {
        if (!confirm("Confirmar arremate deste item?")) return;

        const token = localStorage.getItem("brazug_admin_token");
        try {
            const res = await fetch(`/api/sales/${saleId}/purchase`, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    buyer_character_id: this.characterId
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao realizar arremate.");
            alert("Item arrematado com sucesso!");
            this.loadAuctionDetails(this.lastItemId);
        } catch (e) {
            alert(e.message);
        }
    },

    resetSearch() {
        document.getElementById('filter_name').value = '';
        document.getElementById('min_lvl').value = '';
        document.getElementById('max_lvl').value = '';
        document.getElementById('filter_quality').value = '';
        
        document.querySelectorAll('.ah-cat-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.ah-cat-btn[data-cat=""]').classList.add('active');
        this.currentCategory = '';
        
        document.getElementById('sales-container').innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--ah-gold); font-style:italic;">Escolha os filtros e clique em "Buscar"</div>';
        document.getElementById('statusText').textContent = 'Pronto';
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

    selectItemToSell(id, name) {
        document.getElementById("sell_item_id").value = id;
        document.getElementById("sell_item_name").value = name;

        // Habilitar campos
        ["sell_gold", "sell_silver", "sell_copper", "sell_quantity", "sell_duration", "btn-create-sale"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = false;
                if (el.tagName !== 'BUTTON') {
                    el.style.background = "var(--ah-input-bg)";
                    el.style.color = "var(--ah-text-white)";
                }
            }
        });
    },

    async createSale() {
      const token = localStorage.getItem("brazug_admin_token");
      if (!token) {
        alert("Você precisa estar logado.");
        window.location.href = '/login.html';
        return;
      }
      
      const gold = parseInt(document.getElementById("sell_gold").value) || 0;
      const silver = parseInt(document.getElementById("sell_silver").value) || 0;
      const copper = parseInt(document.getElementById("sell_copper").value) || 0;
      const totalCopper = (gold * 10000) + (silver * 100) + copper;
      
      const sale = {
        character_id: this.characterId,
        item_id: document.getElementById("sell_item_id").value,
        item_name: document.getElementById("sell_item_name").value,
        price: totalCopper,
        quantity: document.getElementById("sell_quantity").value || 1,
        duration_hours: document.getElementById("sell_duration").value
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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao criar anúncio");
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
