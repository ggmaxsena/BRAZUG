(function () {
  "use strict";

  var aliveGrid = document.getElementById("heroes-alive-grid");
  var deadGrid = document.getElementById("heroes-dead-grid");

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadHeroes() {
    try {
      const res = await fetch("/api/characters");
      const chars = await res.json();

      if (!chars || !Array.isArray(chars)) return;

      const alive = chars.filter(c => !c.is_dead);
      const dead = chars.filter(c => c.is_dead);

      renderGrid(aliveGrid, alive);
      renderGrid(deadGrid, dead);

    } catch (err) {
      console.error("Erro ao carregar heróis:", err);
    }
  }

  function renderGrid(container, list) {
    if (!container) return;
    
    if (list.length === 0) {
      container.innerHTML = '<p style="color: #888; text-align: center; grid-column: 1/-1;">Ninguém por aqui ainda...</p>';
      return;
    }

    container.innerHTML = list.map(function(char) {
      let deathInfo = "";
      if (char.is_dead) {
        deathInfo = `
          <div style="background: #300; color: #ffaaaa; padding: 5px; border-radius: 4px; font-size: 11px; margin: 5px 0;">
            <b>Morte:</b> ${escapeHtml(char.death_cause)} (Lv ${char.death_level})
          </div>
        `;
      }

      // NOVO: Link para a página de detalhes do personagem
      const detailUrl = `/personagem.html?id=${char.id}`;

      return `
        <a href="${detailUrl}" class="hero-card-link" style="text-decoration: none; color: inherit; display: block;">
          <div class="hero-card ${char.is_dead ? 'dead' : ''}" style="background: #1a1a1a; border: 1px solid #333; padding: 15px; border-radius: 8px; position: relative; height: 100%; transition: transform 0.2s, border-color 0.2s;">
            ${char.image_url ? `<img src="${char.image_url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 10px; border: 1px solid #222;">` : '<div style="width: 100%; height: 150px; background: #222; border-radius: 4px; margin-bottom: 10px;"></div>'}
            <h3 style="margin: 0; color: #00ff88; font-size: 16px;">${escapeHtml(char.name)}</h3>
            <p style="margin: 5px 0; font-size: 13px; color: #aaa;">Lv ${char.is_dead ? (char.death_level || char.level) : char.level} ${escapeHtml(char.class)}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Por: ${escapeHtml(char.owner_username || 'Brazuguer')}</p>
            
            ${deathInfo}
            
            <div style="margin-top: 10px; font-size: 11px; color: #00ff88; font-weight: bold;">
                Ver Detalhes ➜
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  loadHeroes();
})();
