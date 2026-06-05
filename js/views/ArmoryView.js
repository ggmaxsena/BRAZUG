(function (root) {
  "use strict";

  const ArmoryView = {
    renderHeader(char, role) {
      document.getElementById('char-name').textContent = char.name;
      document.getElementById('char-meta').innerHTML = `<span style="color:#888;">Nível</span> ${char.level} <span style="color:#888;">${char.race}</span> ${char.class}`;
      document.getElementById('char-guild').textContent = char.guild ? `<${char.guild}>` : '';
      document.getElementById('char-avatar-box').innerHTML = `<img src="${char.avatarUrl || '/assets/branding/contentbra.png'}" class="avatar-img" onerror="this.src='/assets/branding/contentbra.png'">`;
      document.getElementById('char-lore-link').href = `/personagem.html?name=${char.name}`;
      
      const statusBadge = document.getElementById('status-badge');
      if (statusBadge) {
        const isDead = char.profile?.is_dead;
        if (isDead) {
          statusBadge.textContent = 'Herói Tombado';
          statusBadge.className = 'bg-red-500/20 border border-red-500/50 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest';
        } else {
          statusBadge.textContent = 'Herói Ativo';
          statusBadge.className = 'bg-green-500/20 border border-green-500/50 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest';
        }
      }

      const syncBtn = document.getElementById('admin-sync-btn');
      if (syncBtn) {
        syncBtn.style.display = role === 'admin' ? 'inline-block' : 'none';
      }
    },

    renderGear(containerId, items, slots, slotNames, rarityColors, avatarUrl) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const leftSlots = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'SHIRT', 'TABARD', 'WRIST'];
      const rightSlots = ['HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2'];
      const weaponSlots = ['MAIN_HAND', 'OFF_HAND', 'RANGED'];

      const renderSlot = (slot) => {
        const item = items.find(i => i.slot === slot);
        const rawQuality = item?.item_quality || item?.quality || 'POOR';
        const quality = rawQuality.toUpperCase();
        const color = rarityColors[quality] || '#9d9d9d';
        const iconData = item?.item_icon || item?.icon;
        const itemId = item?.item_id || item?.itemId;
        
        let iconUrl = null;
        if (iconData) {
          // Use local proxy for icons
          const iconName = iconData.includes('.') ? iconData : `${iconData}.jpg`;
          iconUrl = iconData.startsWith('http') ? iconData : `/assets/icons/${iconName}`;
        }

        return `
          <div class="gear-slot-item" 
               onmouseenter="ArmoryController.handleMouseEnter(event, ${itemId || 0})"
               onmouseleave="ArmoryController.handleMouseLeave()"
               onclick="${itemId ? `window.open('https://www.wowhead.com/classic/item=${itemId}', '_blank')` : ''}">
              <div class="gear-icon-box ${quality.toLowerCase()}">
                  ${iconUrl ? `<img src="${iconUrl}" onerror="this.style.opacity='0.5'">` : `<span style="font-size:8px; color:#222;">${slot.substring(0,3)}</span>`}
              </div>
              <div class="gear-text-box">
                  <div class="gear-slot-label">${slotNames[slot] || slot}</div>
                  <div class="gear-item-name ${quality.toLowerCase()} ${!itemId ? 'empty' : ''}">${item?.item_name || item?.name || 'Vazio'}</div>
              </div>
          </div>
        `;
      };

      container.innerHTML = `
        <div class="gear-classic-grid">
          <div class="gear-side">
            ${leftSlots.map(s => renderSlot(s)).join('')}
          </div>
          
          <div class="gear-center">
            <div class="char-model-frame">
              <img src="${avatarUrl || '/assets/branding/contentbra.png'}" onerror="this.src='/assets/branding/contentbra.png'">
            </div>
            <div class="ilvl-badge">
              <div class="ilvl-num" id="avg-ilvl">--</div>
              <div class="ilvl-label">ITEM LEVEL</div>
            </div>
            <div style="width:100%; display:flex; flex-direction:column; gap:6px;">
              ${weaponSlots.map(s => renderSlot(s)).join('')}
            </div>
          </div>

          <div class="gear-side">
            ${rightSlots.map(s => renderSlot(s)).join('')}
          </div>
        </div>
      `;

      // Calculate avg ilvl
      const equipped = items.filter(i => i.item_id || i.itemId);
      if (equipped.length > 0) {
        const avg = Math.round(equipped.reduce((acc, i) => acc + (i.item_level || i.level || 0), 0) / equipped.length);
        document.getElementById('avg-ilvl').textContent = avg;
      }
    },

    renderStats(containerId, stats) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const renderLine = (label, val, colorClass = '') => `
        <div class="stat-row">
          <span class="stat-name">${label}</span>
          <span class="stat-val ${colorClass}">${val}</span>
        </div>
      `;

      container.innerHTML = `
        <div class="stats-panel-inner">
          <div style="font-size:9px; color:var(--brazug-gold); font-weight:800; text-transform:uppercase; margin-bottom:8px; letter-spacing:1px;">Atributos Base</div>
          ${renderLine('Vida', stats.health || '--', 'green')}
          ${renderLine('Poder', stats.power || '--', 'blue')}
          ${renderLine('Vigor', stats.stamina?.effective || stats.stamina || '--')}
          ${renderLine('Força', stats.strength?.effective || stats.strength || '--')}
          ${renderLine('Agilidade', stats.agility?.effective || stats.agility || '--')}
          ${renderLine('Intelecto', stats.intellect?.effective || stats.intellect || '--')}
          
          <div class="stat-section-title">Ataque</div>
          ${renderLine('Poder de Ataque', stats.attack_power || '--')}
          ${renderLine('Crítico', (parseFloat(stats.crit_chance || 0)).toFixed(2) + '%' || '--')}
          ${renderLine('Perícia', stats.expertise || '--')}

          <div class="stat-section-title">Defesa</div>
          ${renderLine('Armadura', stats.armor?.effective || stats.armor || '--')}
          ${renderLine('Esquiva', (parseFloat(stats.dodge || 0)).toFixed(2) + '%' || '--')}
          ${renderLine('Parada', (parseFloat(stats.parry || 0)).toFixed(2) + '%' || '--')}
          ${renderLine('Bloqueio', (parseFloat(stats.block || 0)).toFixed(2) + '%' || '--')}
        </div>
      `;
    },

    renderTalents(containerId, groups, charClass) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = groups.flatMap(g => g.specializations).map(s => {
        const specPts = s.talents?.reduce((acc, t) => acc + (t.talent_rank || 0), 0) || 0;
        const specId = s.specialization_id;
        const bgUrl = `https://wow.zamimg.com/images/wow/talents/backgrounds/classic/${specId}.jpg`;

        const rows = 7, cols = 4;
        const grid = Array.from({length: rows}, () => Array(cols).fill(null));
        s.talents?.forEach(t => { 
            if (t.talent.row < rows && t.talent.column < cols) {
                grid[t.talent.row][t.talent.column] = t; 
            }
        });

        let talentsHtml = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = grid[r][c];
                if (!t) {
                    talentsHtml += `<div class="talent-item rank-zero" style="grid-row: ${r+1}; grid-column: ${c+1}; pointer-events:none; opacity:0;"></div>`;
                    continue;
                }

                const spellId = t.spell_tooltip?.spell?.id;
                const icon = t.talent.icon ? `https://render.worldofwarcraft.com/classic1x-us/icons/56/${t.talent.icon}.jpg` : null;
                const isMax = t.talent_rank >= (t.talent.max_rank || 5);

                talentsHtml += `
                    <div class="talent-item ${isMax ? 'rank-max' : ''} ${t.talent_rank === 0 ? 'rank-zero' : 'rank-partial'}" 
                       style="grid-row: ${r+1}; grid-column: ${c+1};"
                       onmouseenter="ArmoryController.handleMouseEnter(event, ${spellId}, 'spell')"
                       onmouseleave="ArmoryController.handleMouseLeave()">
                        <div class="talent-icon-wrap">
                            <img src="${icon}" class="talent-icon" onerror="this.src='/assets/branding/contentbra.png'">
                        </div>
                        ${t.talent_rank > 0 ? `<div class="talent-rank-badge ${isMax ? '' : 'not-max'}">${t.talent_rank}</div>` : ''}
                    </div>
                `;
            }
        }

        return `
            <div class="talent-box class-${charClass}" style="--spec-bg: url('${bgUrl}')">
                <div class="talent-header">
                    <span>${s.specialization_name}</span>
                    <span>${specPts} pts</span>
                </div>
                <div class="talent-list">
                    ${talentsHtml}
                </div>
            </div>
        `;
      }).join('');
    },

    renderProfessions(containerId, profs) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = profs.map(p => `
          <div class="stat-row">
              <span class="stat-name">${p.name}</span>
              <span class="stat-val" style="font-size: 14px;">${p.skillPoints} / ${p.maxSkillPoints}</span>
          </div>
      `).join('') || '<p style="color:#444; font-size:12px; font-style:italic;">Nenhuma profissão ativa.</p>';
    },

    renderPlannerGrid(containerId, plannerItems, slots, slotNames, rarityColors, avatarUrl) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const leftSlots = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'SHIRT', 'TABARD', 'WRIST'];
      const rightSlots = ['HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2'];
      const bottomSlots = ['MAIN_HAND', 'OFF_HAND', 'RANGED'];

      const renderSlot = (slot) => {
        const item = plannerItems[slot];
        const color = item?.quality ? rarityColors[item.quality] : '#1a1a1a';
        const iconData = item?.icon;
        const itemId = item?.itemId;
        
        let iconUrl = null;
        if (iconData) {
          // Use local proxy for icons
          const iconName = iconData.includes('.') ? iconData : `${iconData}.jpg`;
          iconUrl = iconData.startsWith('http') ? iconData : `/assets/icons/${iconName}`;
        }

        return `
            <div class="item-slot ${item ? 'has-item' : ''}" 
                 style="${itemId ? `border-color: ${color}99; box-shadow: 0 0 10px ${color}44;` : ''}"
                 onclick="ArmoryController.openSearch('${slot}')"
                 onmouseenter="${item ? `ArmoryController.handleMouseEnter(event, ${item.itemId})` : ''}"
                 onmouseleave="ArmoryController.handleMouseLeave()">
                ${iconUrl ? `<img src="${iconUrl}" onerror="this.onerror=null; this.src='https://wow.zamimg.com/images/wow/icons/large/${item?.icon || 'inv_misc_questionmark'}.jpg';">` : `<span class="item-slot-label">${slotNames[slot]?.substring(0,4) || slot.substring(0,4)}</span>`}
                ${item ? `<button class="slot-clear-btn" onclick="event.stopPropagation(); ArmoryController.clearSlot('${slot}')" style="display:block; position:absolute; top:-5px; right:-5px; background:#000; border:1px solid #c41e3a; color:#c41e3a; border-radius:50%; width:16px; height:18px; font-size:10px; cursor:pointer;">✕</button>` : ''}
            </div>
        `;
      };

      container.innerHTML = `
        <div class="paper-doll-container">
          <div class="doll-column">
            ${leftSlots.map(s => renderSlot(s)).join('')}
          </div>
          <div class="paper-doll-model">
            <img src="${avatarUrl || '/assets/branding/contentbra.png'}" onerror="this.src='/assets/branding/contentbra.png'">
          </div>
          <div class="doll-column">
            ${rightSlots.map(s => renderSlot(s)).join('')}
          </div>
        </div>
        <div class="doll-row-bottom">
          ${bottomSlots.map(s => renderSlot(s)).join('')}
        </div>
      `;
    },

    renderTPTrees(containerId, groups, tpState, charClass) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = groups.flatMap(g => g.specializations).map(s => {
        const specPts = s.talents?.reduce((acc, t) => acc + (tpState[t.talent.id] || 0), 0) || 0;
        const specId = s.specialization_id;
        const bgUrl = `https://wow.zamimg.com/images/wow/talents/backgrounds/classic/${specId}.jpg`;

        // Build grid (7 rows x 4 cols)
        const rows = 7, cols = 4;
        const grid = Array.from({length: rows}, () => Array(cols).fill(null));
        s.talents?.forEach(t => { 
            if (t.talent.row < rows && t.talent.column < cols) {
                grid[t.talent.row][t.talent.column] = t; 
            }
        });

        // Arrow Connectors
        let arrowsHtml = '';
        const cellSize = 52;
        const gap = 12;
        
        s.talents?.forEach(t => {
            const parent = s.talents.find(p => p.talent.column === t.talent.column && p.talent.row === t.talent.row - 1);
            if (parent) {
                const isActive = (tpState[parent.talent.id] || 0) >= (parent.talent.max_rank || 5);
                const topPx = parent.talent.row * (cellSize + gap) + cellSize;
                const leftPx = parent.talent.column * (cellSize + gap) + (cellSize / 2) - 2;
                const height = gap;
                arrowsHtml += `<div class="t-arrow t-arrow-down ${isActive ? 'active' : ''}" 
                                    style="top:${topPx}px; left:${leftPx}px; height:${height}px;"></div>`;
            }
        });

        let talentsHtml = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = grid[r][c];
                if (!t) {
                    talentsHtml += `<div class="talent-item rank-zero" style="grid-row: ${r+1}; grid-column: ${c+1}; pointer-events:none; opacity:0;"></div>`;
                    continue;
                }

                const tid = t.talent.id;
                const cur = tpState[tid] || 0;
                const max = t.talent.max_rank || 5;
                const icon = t.talent.icon ? `https://render.worldofwarcraft.com/classic1x-us/icons/56/${t.talent.icon}.jpg` : null;
                
                const reqPts = t.talent.row * 5;
                const isLocked = specPts < reqPts && cur === 0;
                const isMax = cur >= max;
                const isPartial = cur > 0 && !isMax;

                talentsHtml += `
                    <div class="talent-item ${isMax ? 'rank-max' : ''} ${isPartial ? 'rank-partial' : ''} ${isLocked ? 'rank-zero' : ''}" 
                       style="grid-row: ${r+1}; grid-column: ${c+1};"
                       title="${t.talent.name} (${cur}/${max})"
                       onmouseenter="ArmoryController.handleMouseEnter(event, ${t.spell_tooltip?.spell?.id}, 'spell')"
                       onmouseleave="ArmoryController.handleMouseLeave()"
                       onclick="ArmoryController.addTPPoint('${tid}', ${max}, ${t.talent.row}, '${s.specialization_name}')"
                       oncontextmenu="event.preventDefault(); ArmoryController.removeTPPoint('${tid}', ${t.talent.row}, '${s.specialization_name}')">
                        <div class="talent-icon-wrap">
                            <img src="${icon}" class="talent-icon" onerror="this.src='/assets/branding/contentbra.png'">
                        </div>
                        ${cur > 0 ? `<div class="talent-rank-badge ${isMax ? '' : 'not-max'}">${cur}</div>` : ''}
                    </div>
                `;
            }
        }

        return `
            <div class="talent-box class-${charClass}" style="--spec-bg: url('${bgUrl}')">
                <div class="talent-header">
                    <span>${s.specialization_name}</span>
                    <span>${specPts} pts</span>
                </div>
                <div class="talent-list">
                    ${arrowsHtml}
                    ${talentsHtml}
                </div>
            </div>
        `;
      }).join('');
    },

    renderTPDistribution(containerId, groups, tpState, MAX_TP_PTS) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = groups.flatMap(g => g.specializations).map(s => {
          const pts = s.talents?.reduce((acc, t) => acc + (tpState[t.talent.id] || 0), 0) || 0;
          const pct = (pts / MAX_TP_PTS * 100).toFixed(0);
          return `
              <div style="margin-bottom:10px;">
                  <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:4px;">
                      <span>${s.specialization_name}</span>
                      <span style="color:var(--gold);">${pts}</span>
                  </div>
                  <div style="height:6px; background:rgba(0,0,0,0.5); border-radius:3px; overflow:hidden; border:1px solid #222;">
                      <div style="height:100%; width:${pct}%; background:var(--gold); box-shadow:0 0 5px var(--gold);"></div>
                  </div>
              </div>
          `;
      }).join('');
    },

    renderSearchResults(containerId, items, rarityColors) {
      const resultsEl = document.getElementById(containerId);
      if (!resultsEl) return;

      if (items.length === 0) {
          resultsEl.innerHTML = '<div style="text-align:center; padding:40px; color:#444;">Nenhum item encontrado no banco local.</div>';
          return;
      }
      
      resultsEl.innerHTML = items.map(item => `
          <div class="search-item" onclick="ArmoryController.selectItem(${item.id})">
              <img src="https://render.worldofwarcraft.com/classic1x-us/icons/56/${item.icon}.jpg" style="width:32px; height:32px; border-radius:4px;">
              <div>
                  <div style="font-weight:700; color:${rarityColors[item.quality] || '#fff'}">${item.name}</div>
                  <div style="font-size:10px; color:#555;">${item.quality}</div>
              </div>
          </div>
      `).join('');
    },

    renderTooltip(containerId, item, rarityColors) {
      const tt = document.getElementById(containerId);
      if (!tt) return;

      const data = item.tooltip_data || {};
      const color = rarityColors[item.quality] || '#fff';
      
      let html = `
          <div class="tt-name" style="color:${color}">${item.name}</div>
          <div class="tt-quality" style="color:${color}">${item.quality}</div>
      `;

      if (data.level) {
          html += `<div style="color:#fff">Item Level ${data.level.value || data.level}</div>`;
      }
      
      if (data.binding) {
          html += `<div style="color:#fff">${data.binding.name}</div>`;
      }

      if (data.inventory_type) {
          html += `<div class="tt-slot">${data.inventory_type.name}</div>`;
      }
      if (data.item_subclass) {
          html += `<div class="tt-type">${data.item_subclass.name}</div>`;
      }
      html += `<div class="tt-clear"></div>`;

      if (data.weapon) {
          const w = data.weapon;
          if (w.damage) html += `<div style="color:#fff">${w.damage.display_string}</div>`;
          if (w.attack_speed) html += `<div style="color:#fff; float:left;">Velocidade ${w.attack_speed.display_string}</div>`;
          if (w.dps) html += `<div style="color:#fff; float:right;">(${w.dps.display_string} por segundo)</div>`;
          html += `<div class="tt-clear"></div>`;
      }

      if (data.armor) {
          html += `<div style="color:#fff">${data.armor.display.display_string}</div>`;
      }
      
      if (data.stats) {
          data.stats.forEach(s => {
              const statClass = (s.display.color?.r === 0 && s.display.color?.g === 255) ? 'tt-green' : 'tt-stat';
              html += `<div class="${statClass}">${s.display.display_string}</div>`;
          });
      }
      
      if (data.spells) {
          data.spells.forEach(s => {
              html += `<div class="tt-green">${s.description}</div>`;
          });
      }

      if (data.durability) {
          html += `<div style="color:#fff">${data.durability.display_string}</div>`;
      }

      if (data.required_level) {
          html += `<div style="color:#fff">Requer Nível ${data.required_level}</div>`;
      }
      
      if (data.set) {
          html += `<div class="tt-gold" style="margin-top:10px;">${data.set.display_string}</div>`;
          data.set.items.forEach(si => {
              html += `<div style="color:#666; font-size:11px; margin-left:10px;">${si.item.name}</div>`;
          });
      }

      if (item.description || data.description) {
          html += `<div class="tt-desc">"${item.description || data.description}"</div>`;
      }

      if (data.sell_price) {
          html += `<div style="color:#fff; margin-top:10px;">Preço de Venda: ${data.sell_price.display_strings?.header || ''} ${data.sell_price.display_strings?.gold || ''} ${data.sell_price.display_strings?.silver || ''} ${data.sell_price.display_strings?.copper || ''}</div>`;
      }
      
      tt.innerHTML = html;
    },

    renderSpellTooltip(containerId, data) {
      const tt = document.getElementById(containerId);
      if (!tt) return;

      const spell = data.spell || {};
      
      let html = `
          <div class="tt-name" style="color:#ffd100">${spell.name}</div>
          <div class="tt-type" style="color:#fff">${data.cast_time || 'Passivo'}</div>
          <div class="tt-clear"></div>
      `;

      if (data.range) {
          html += `<div style="color:#fff">${data.range}</div>`;
      }

      if (data.power_cost) {
          html += `<div style="color:#fff">${data.power_cost}</div>`;
      }

      if (data.cooldown) {
          html += `<div style="color:#fff">${data.cooldown}</div>`;
      }

      if (data.description) {
          html += `<div class="tt-green" style="margin-top:8px;">${data.description}</div>`;
      }
      
      tt.innerHTML = html;
    },

    renderSetsList(containerId, sets, rarityColors, isActiveChar) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (sets.length === 0) {
          container.innerHTML = `
              <div class="sets-empty">
                  <div class="sets-empty-icon">🛡️</div>
                  <div>Nenhum set salvo ainda.</div>
                  <div style="margin-top:6px; font-size:10px;">Carregue um personagem e salve sua configuração atual.</div>
              </div>`;
          return;
      }

      container.innerHTML = sets.map(set => {
          const date = new Date(set.savedAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' });
          const gearIcons = set.gear.slice(0, 12).map(item => {
              const color = rarityColors[item.quality] || '#333';
              const iconUrl = item.icon ? `https://render.worldofwarcraft.com/classic1x-us/icons/56/${item.icon}.jpg` : null;
              return `<div class="set-gear-icon" style="border-color:${color}44;" title="${item.name || item.slot}">
                  ${iconUrl ? `<img src="${iconUrl}" onerror="this.style.opacity='0'">` : ''}
              </div>`;
          }).join('');

          const talentChips = set.talents?.filter(t => t.pts > 0).map(t =>
              `<span class="set-talent-chip">${t.name} <b>${t.pts}</b></span>`
          ).join('') || '<span style="color:#333; font-size:10px; font-style:italic;">Sem talentos</span>';

          const isCurrentChar = isActiveChar && isActiveChar.toLowerCase() === set.char.name.toLowerCase();

          return `
          <div class="set-card ${isCurrentChar ? 'active-set' : ''}" id="set-card-${set.id}">
              <div class="set-card-header" onclick="ArmoryController.toggleSetCard(${set.id})">
                  <div class="set-card-avatar">
                      <img src="${set.char.avatarUrl || '/assets/branding/contentbra.png'}" onerror="this.src='/assets/branding/contentbra.png'">
                  </div>
                  <div class="set-card-info">
                      <div class="set-card-name">${set.name}</div>
                      <div class="set-card-meta">
                          <b>${set.char.name}</b> · Lv${set.char.level} ${set.char.race} ${set.char.class} · ${date}
                      </div>
                  </div>
                  <div class="set-card-actions">
                      <button class="set-action-btn" title="Detalhes" onclick="event.stopPropagation(); ArmoryController.toggleSetCard(${set.id})">▾</button>
                      <button class="set-action-btn danger" title="Deletar" onclick="event.stopPropagation(); ArmoryController.deleteSet(${set.id})">✕</button>
                  </div>
              </div>

              <div class="set-card-body" id="set-body-${set.id}">
                  <div class="set-stats-grid">
                      <div class="set-stat-chip">
                          <div class="set-stat-chip-label">Vida</div>
                          <div class="set-stat-chip-val" style="color:#2ecc71;">${set.stats.health || '—'}</div>
                      </div>
                      <div class="set-stat-chip">
                          <div class="set-stat-chip-label">Poder</div>
                          <div class="set-stat-chip-val" style="color:#3498db;">${set.stats.power || '—'}</div>
                      </div>
                      <div class="set-stat-chip">
                          <div class="set-stat-chip-label">Vigor</div>
                          <div class="set-stat-chip-val">${set.stats.stamina || '—'}</div>
                      </div>
                      <div class="set-stat-chip">
                          <div class="set-stat-chip-label">Força</div>
                          <div class="set-stat-chip-val">${set.stats.strength || '—'}</div>
                      </div>
                      <div class="set-stat-chip">
                          <div class="set-stat-chip-label">Agilidade</div>
                          <div class="set-stat-chip-val">${set.stats.agility || '—'}</div>
                      </div>
                      <div class="set-stat-chip">
                          <div class="set-stat-chip-label">Intelecto</div>
                          <div class="set-stat-chip-val">${set.stats.intellect || '—'}</div>
                      </div>
                  </div>

                  <div style="font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#444; font-weight:700; margin-top:14px; margin-bottom:6px;">Equipamento</div>
                  <div class="set-gear-preview">${gearIcons}</div>

                  <div style="font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#444; font-weight:700; margin-top:14px; margin-bottom:6px;">Talentos</div>
                  <div class="set-talents-preview">${talentChips}</div>
              </div>
          </div>`;
      }).join('');
    }
  };

  root.ArmoryView = ArmoryView;
})(window);
