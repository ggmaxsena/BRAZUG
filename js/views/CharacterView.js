(function (root) {
  "use strict";

  const CharacterView = {
    // ==========================================================
    // GERENCIAMENTO — Listagem de fichas (ficha.html)
    // ==========================================================

    renderList(chars, container, currentUsername, role) {
      if (!container) return;
      const isAdmin = role === "admin";
      container.innerHTML = chars.map(c => this.createCard(c, currentUsername, isAdmin)).join("");
    },

    createCard(c, currentUsername, isAdmin) {
      const isOwner = c.owner_username === currentUsername;
      const canEdit = isAdmin || isOwner;

      const hasVideo = !!(
        c.video_url ||
        (c.lore && c.lore.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv)\/[^\s<"']+/))
      );
      const videoBadge = hasVideo
        ? `<span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: var(--gold); padding: 4px 8px; border-radius: 4px; font-size: 11px; z-index: 2; border: 1px solid var(--gold); font-weight: bold;">🎥 LORE</span>`
        : "";

      const realmLabels = { "doomhowl": "Doomhowl", "forever-pvp": "Forever PVP", "forever-hc": "Forever HC" };
      const realmText = realmLabels[c.realm] || (c.realm ? this.escape(c.realm) : "");

      return `
        <div class="hero-card ${c.is_dead ? "dead" : ""}" style="position: relative;">
          ${videoBadge}
          ${c.image_url ? `<img src="${this.escape(c.image_url)}" class="mural-card-img" alt="${this.escape(c.name)}">` : ""}
            <div class="mural-card-body">
            <h3 class="mural-card-title">${this.escape(c.name)}</h3>
            <p class="mural-card-text">${this.escape(c.class || "Sem classe")} - Lvl ${c.is_dead ? (c.death_level || c.level) : c.level}${realmText ? ` · ${realmText}` : ""}</p>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
              <button class="discord-btn" style="border:none; width:100%; cursor:pointer; background: var(--gold); color: #000;" onclick="CharacterController.view('${c.id}')">Ver Ficha Pública</button>
              ${canEdit ? `<a href="/vendas.html?character_id=${c.id}" class="discord-btn" style="border:none; width:100%; cursor:pointer; background: #4a3d28; color: var(--gold); text-decoration: none; text-align: center; line-height: 1.2; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">Comércio / Leilão</a>` : ""}
              ${canEdit ? `<button class="discord-btn" style="border:none; width:100%; cursor:pointer;" onclick="CharacterController.edit('${c.id}')">Editar</button>` : ""}
              ${isAdmin ? `<button class="discord-btn" style="border:none; width:100%; cursor:pointer; background: #cc0000;" onclick="CharacterController.deleteCharacter('${c.id}')">Excluir</button>` : ""}
            </div>
          </div>
        </div>
      `;
    },

    sheetSection(char) {
      const s = char.sheet || {};
      const fields = [
        ["Aparência", s.appearance],
        ["Antecedente", s.background],
        ["Traços de Personalidade", s.personality],
        ["Ideais", s.ideals],
        ["Laços", s.bonds],
        ["Defeitos", s.flaws]
      ];
      const filled = fields.filter(([, v]) => v && String(v).trim());
      if (!filled.length) return "";

      return `
        <div style="margin-top: 40px; border: 2px solid var(--gold); border-radius: 10px; padding: 28px; background: rgba(0,0,0,0.35);">
          <h2 style="color: var(--gold); font-family: 'Cinzel', serif; text-align: center; letter-spacing: 2px; margin-bottom: 24px;">Ficha do Herói</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;">
            ${filled.map(([label, v]) => `
              <div style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.25);">
                <div style="color: var(--gold); font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; margin-bottom: 8px;">${this.escape(label)}</div>
                <div style="color: var(--text-muted); white-space: pre-wrap; line-height: 1.6;">${this.escape(v)}</div>
              </div>`).join("")}
          </div>
        </div>`;
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s == null ? "" : String(s);
      return d.innerHTML;
    },

    // ==========================================================
    // FICHA PÚBLICA — Detalhe do herói (personagem.html)
    // ==========================================================

    renderDetail(char, container, context = {}) {
      if (!container || !char) return;
      container.innerHTML = this.renderHero(char, context);
    },

    renderHero(char, context) {
      const isManageable = context.canManage === true;

      let html = "";
      html += this.deathBanner(char);

      html += `
            <div class="card">
                <div style="display: flex; gap: 40px; flex-wrap: wrap; align-items: flex-start;">
                    <img src="${this.escape(char.image_url || "/assets/branding/contentbra.png")}" style="width: 350px; height: 350px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
                    <div style="flex: 1; min-width: 300px;">
                        <p class="eyebrow" style="color: var(--gold); margin-bottom: 10px;">Herói de Brazug</p>
                        <h1 style="font-size: 56px; margin-bottom: 5px; color: var(--gold); line-height: 1.1;">${this.escape(char.name)}</h1>
                        ${this.reputationBanner(char)}
                        <p style="font-size: 24px; color: var(--text-muted); margin-bottom: 10px;">Level ${char.is_dead ? (char.death_level || char.level) : char.level} ${char.class}</p>
                        <p style="color: var(--text-muted); font-size: 18px;">${this.escape(char.race)} | ${this.escape(char.guild)}${(() => { const rl = { "forever-pvp": "Forever PVP", "forever-hc": "Forever HC" }; return char.realm && rl[char.realm] ? ` | ${rl[char.realm]}` : ""; })()}</p>
                        <p style="font-size: 14px; margin-top: 25px; color: #888;">Criado por: <b style="color: var(--text);">${this.escape(char.owner_username || "Brazuguer")}</b></p>

                        <div style="display: flex; gap: 15px; margin-top: 30px; flex-wrap: wrap;">
                            ${!char.is_dead && (!char.realm || char.realm === "doomhowl") ? `<a href="https://classic-armory.org/character/us/classic-hardcore/doomhowl/${char.name.toLowerCase()}" target="_blank" class="discord-btn" style="background: #333; color: #fff; border: 1px solid #555;">Classic Armory</a>` : ""}
                            ${isManageable ? `<a href="/vendas.html?character_id=${char.id}" class="discord-btn" style="background: #2a5a2a; color: #fff; border: none; font-weight: bold;">Comércio / Leilão</a>` : ""}
                            ${this.videoButton(char)}
                            ${char.twitch_url ? `<a href="${this.escape(char.twitch_url)}" target="_blank" class="discord-btn" style="background: #9146ff; border: none;">Twitch</a>` : ""}
                            ${char.youtube_url ? `<a href="${this.escape(char.youtube_url)}" target="_blank" class="discord-btn" style="background: #ff0000; border: none;">YouTube</a>` : ""}
                        </div>
                    </div>
                </div>

                <div id="video-lore-container">
                    ${this.renderEmbeds(char)}
                </div>

                <div style="margin-top: 50px; border-top: 1px solid #333; padding-top: 40px;">
                    <h2 style="color: var(--gold); font-size: 28px; margin-bottom: 20px;">Lore / Biografia</h2>
                    <div class="lore-content" style="line-height: 2; color: #ccc; font-style: italic; font-size: 18px;">
                        ${this.loreSection(char)}
                    </div>
                </div>

                ${this.sheetSection(char)}

                <div id="debug-info" style="margin-top:20px; font-size:10px; color:#444; border-top: 1px solid #111; padding-top: 10px;">
                    Char ID: ${char.id} | Platform: ${char.video_platform} | ID: ${char.video_id} | Video URL: ${char.video_url ? 'Sim' : 'Não'}
                </div>

                <div style="margin-top: 40px;">
                    <h2 style="color: var(--gold); font-size: 28px; margin-bottom: 20px;">Profissões e Habilidades</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${this.professionsSection(char)}
                    </div>
                </div>

                ${this.reputationSection(char)}
            </div>
        `;

      return html;
    },

    deathBanner(char) {
      if (!char.is_dead) return "";
      return `
            <div class="card" style="border-color: var(--horde-red); background: rgba(196, 30, 58, 0.05); margin-bottom: 30px;">
                <h3 style="margin:0; color: var(--horde-red); font-size: 24px;">FALECIDO HEROICAMENTE NO LV ${char.death_level || char.level}</h3>
                <p style="margin:10px 0 0 0; color: #ffaaaa;"><b>Causa:</b> ${char.death_cause || 'Desconhecida'} | <b>Local:</b> ${char.death_location || 'Desconhecido'}</p>
            </div>
        `;
    },

    reputationBanner(char) {
      if (!char.reputation || parseInt(char.reputation.total_feedbacks) < 5) return "";
      const rating = parseFloat(char.reputation.average_rating || 0);

      let sealImg = "";
      let sealName = "";

      if (rating < 3) {
        sealImg = "/assets/branding/mduvidoso.png";
        sealName = "Mercador Duvidoso";
      } else if (rating < 4.5) {
        sealImg = "/assets/branding/mhorda.png";
        sealName = "Mercador da Horda";
      } else {
        sealImg = "/assets/branding/mlendario.png";
        sealName = "Mercador Lendário";
      }

      const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));

      return `
                                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                        <img src="${sealImg}" alt="${sealName}" style="width: 50px; height: 50px;" title="${sealName}">
                                        <div>
                                            <div style="color: var(--gold); font-size: 20px; letter-spacing: 1px;">${stars}</div>
                                            <div style="color: #888; font-size: 14px;">${char.reputation.total_feedbacks} avaliações - ${sealName}</div>
                                        </div>
                                    </div>
      `;
    },

    videoButton(char) {
      const loreMatch = char.lore
        ? (char.lore.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv)\/[^\s<"']+/) || [])
        : [];
      const vUrl = char.video_url || loreMatch[0];
      if (!vUrl) return "";

      const info = this.extractVideoInfo(vUrl);
      const hasEmbed = !!(char.video_id && char.video_platform) || !!info.id;

      if (hasEmbed) {
        return `<a href="#lore-video-section" onclick="document.getElementById('lore-video-section')?.scrollIntoView({behavior:'smooth'}); return false;" class="discord-btn" style="background: #fff; color: #000; border: none;">🎥 Ver Vídeo</a>`;
      }
      return `<a href="${vUrl}" target="_blank" class="discord-btn" style="background: #fff; color: #000; border: none;">🎥 Ver Vídeo</a>`;
    },

    renderEmbeds(char) {
        let html = "";
        const host = window.location.hostname;

        let platform = char.video_platform;
        let videoId = char.video_id;
        let videoUrl = char.video_url;

        // Fallback: se não tiver video_url preenchido, tenta extrair da Lore
        if (!videoUrl) {
            const match = char.lore ? (char.lore.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv)\/[^\s<"']+/) || []) : [];
            if (match[0]) videoUrl = match[0];
        }

        // 1. Vídeo de Lore
        if (!videoId && videoUrl) {
            const info = this.extractVideoInfo(videoUrl);
            platform = info.platform;
            videoId = info.id;
        }

        if (videoId && platform) {
            let loreUrl = "";
            if (platform === "youtube") {
                loreUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (platform === "twitch" || platform === "twitch_clip") {
                const isVod = /^\d+$/.test(videoId);
                loreUrl = isVod
                    ? `https://player.twitch.tv/?video=${videoId}&parent=${host}&autoplay=false`
                    : `https://clips.twitch.tv/embed?clip=${videoId}&parent=${host}`;
            }

            if (loreUrl) {
                html += `
                <div id="lore-video-section" style="margin-top: 40px; border-top: 1px solid #333; padding-top: 40px;">
                    <h2 style="color: var(--gold); font-size: 28px; margin-bottom: 20px;">🎬 Vídeo de Lore</h2>
                    <div style="position: relative; padding-bottom: 56.5%; height: 0; overflow: hidden; border-radius: 12px; border: 1px solid #333; background: #000;">
                        <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                            src="${loreUrl}" frameborder="0" allowfullscreen="true" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                        </iframe>
                    </div>
                </div>`;
            }
        }

        // 2. Twitch Live Stream (Canal)
        if (char.twitch_url) {
            const twitchUser = this.extractTwitchUser(char.twitch_url);
            if (twitchUser) {
                html += `
                <div id="twitch-stream-section" style="margin-top: 40px; border-top: 1px solid #333; padding-top: 40px;">
                    <h2 style="color: var(--gold); font-size: 28px; margin-bottom: 20px;">📺 Live Stream (Twitch)</h2>
                    <div style="position: relative; padding-bottom: 56.5%; height: 0; overflow: hidden; border-radius: 12px; border: 1px solid #333; background: #000;">
                        <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                            src="https://player.twitch.tv/?channel=${twitchUser}&parent=${host}&autoplay=false"
                            frameborder="0" allowfullscreen="true" scrolling="no">
                        </iframe>
                    </div>
                </div>`;
            }
        }

        return html;
    },

    extractVideoInfo(url) {
        if (!url) return { platform: null, id: null };

        // YouTube (including Shorts)
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|u\/\w\/|shorts\/))([^#\&\?]*)/);
        if (ytMatch && ytMatch[1].length === 11) {
            return { platform: "youtube", id: ytMatch[1] };
        }

        // Twitch Videos
        const twVod = url.match(/twitch\.tv\/videos\/([0-9]+)/);
        if (twVod) return { platform: "twitch", id: twVod[1] };

        // Twitch Clips
        const twClip = url.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)([a-zA-Z0-9_-]+)/);
        if (twClip) return { platform: "twitch", id: twClip[1] };

        return { platform: null, id: null };
    },

    extractTwitchUser(url) {
        const match = url ? url.match(/twitch\.tv\/([a-z0-9_]+)/i) : null;
        return match ? match[1] : null;
    },

    loreSection(char) {
        const raw = this.formatLore(char.lore);
        const html = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(raw) : this.sanitizeFallback(raw);
        return html;
    },

    sanitizeFallback(raw) {
        if (typeof raw !== "string") return "";
        // Remove tags se o DOMPurify não estiver disponível
        return raw.replace(/<[^>]*>/g, "");
    },

    formatLore(text) {
        if (!text) return "Este herói ainda não registrou sua história...";

        // Tenta detectar se é JSON do Editor.js
        if (text.trim().startsWith("{")) {
            try {
                const data = JSON.parse(text);
                if (data.blocks) {
                    const blocks = data.blocks.map(block => {
                        switch (block.type) {
                            case "paragraph":
                                return `<p style="margin-bottom: 1.5em;">${this.escape(block.data.text)}</p>`;
                            case "header":
                                return `<h${block.data.level} style="color: var(--gold); margin: 1.5em 0 0.5em 0;">${this.escape(block.data.text)}</h${block.data.level}>`;
                            case "list": {
                                const tag = block.data.style === "ordered" ? "ol" : "ul";
                                const items = (block.data.items || []).map(item => `<li style="margin-bottom: 0.5em;">${this.escape(item)}</li>`).join("");
                                return `<${tag} style="margin-bottom: 1.5em; padding-left: 20px;">${items}</${tag}>`;
                            }
                            case "image": {
                                const url = block.data.file?.url || block.data.url || "";
                                const caption = block.data.caption || "";
                                let imgHtml = `<img src="${this.escape(url)}" alt="${this.escape(caption)}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; display: block; border: 1px solid #333;">`;
                                if (caption) imgHtml += `<p style="font-size: 14px; text-align: center; color: #888;">${this.escape(caption)}</p>`;
                                return imgHtml;
                            }
                            case "quote":
                                return `<blockquote style="border-left: 4px solid var(--gold); padding: 10px 20px; font-style: italic; background: rgba(255,255,255,0.05); margin-bottom: 1.5em;">${this.escape(block.data.text)}</blockquote>`;
                            default:
                                return "";
                        }
                    });
                    return blocks.join("");
                }
            } catch (e) {
                // Se falhar o parse, segue para o tratamento legado
            }
        }

        // Se já parece ser HTML (contém tags), retornamos como está
        if (text.includes("<p>") || text.includes("<strong>") || text.includes("<br>")) {
            return text;
        }

        // Se for texto legado, tratamos as quebras de linha e a tag [img]
        let formatted = text.replace(/\n/g, "<br>");

        // Substituir [img]URL[/img] por tags <img>
        formatted = formatted.replace(/\[img\](https?:\/\/[^\]]+)\[\/img\]/gi, (match, url) => {
            return `<img src="${url}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; display: block; border: 1px solid #333;">`;
        });

        return formatted;
    },

    professionsSection(char) {
        const profs = [];
        if (char.prof1_name) profs.push({ name: char.prof1_name, lvl: char.prof1_lvl });
        if (char.prof2_name) profs.push({ name: char.prof2_name, lvl: char.prof2_lvl });
        if (char.prof_cooking_lvl > 0) profs.push({ name: "Cooking", lvl: char.prof_cooking_lvl });
        if (char.prof_aid_lvl > 0) profs.push({ name: "First Aid", lvl: char.prof_aid_lvl });
        if (char.prof_fishing_lvl > 0) profs.push({ name: "Fishing", lvl: char.prof_fishing_lvl });

        const profsHtml = profs.map(p => `
            <div style="background: #111; border: 1px solid #333; padding: 10px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; min-width: 150px;">
                <span style="font-weight: bold; color: ${p.lvl >= 300 ? "var(--gold)" : "#fff"}">${p.name}</span>
                <span style="color: var(--gold); font-weight: 900;">${p.lvl}</span>
            </div>
        `).join('');

        return profsHtml || '<p style="color: #666;">Nenhuma profissão registrada.</p>';
    },

    reputationSection(char) {
        if (!char.reputation || !char.reputation.feedbacks || char.reputation.feedbacks.length === 0) return "";

        const feedbacksHtml = char.reputation.feedbacks.map(f => `
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid #333; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span style="color: var(--gold); font-weight: bold;">${f.author_name}</span>
                                <span style="color: var(--gold);">${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}</span>
                            </div>
                            <div style="font-size: 12px; color: #888; margin-bottom: 10px;">Item: ${f.item_name}</div>
                            <div style="color: #ccc; font-style: italic;">"${f.comment || 'Sem comentário.'}"</div>
                        </div>
                    `).join('');

        return `
                        <div style="margin-top: 50px; border-top: 1px solid #333; padding-top: 40px;">
                            <h2 style="color: var(--gold); font-size: 28px; margin-bottom: 20px;">Avaliações de Comércio</h2>
                            <div>${feedbacksHtml}</div>
                        </div>
        `;
    }
  };

  root.CharacterView = CharacterView;
})(window);
