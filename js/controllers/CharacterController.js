(function (root) {
  "use strict";

  const CharacterController = {
    async fetchFromWoW() {
        const name = document.getElementById("wow-name").value.trim();
        const realm = document.getElementById("wow-realm").value.trim();
        if (!name || !realm) return alert("Preencha Nome e Reino");

        try {
            // Usando a rota de proxy definida em character-routes.cjs
            const res = await fetch(`/api/character/fetch/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || "Personagem não encontrado na Blizzard. Verifique se o nome está correto e se o herói é nível 10+.");
            }
            
            // Resto do código de preenchimento...
            document.getElementById("name").value = data.name;
            
            // Normalize class and race for select elements
            const classMap = {
                "Guerreiro": "Warrior", "Caçador": "Hunter", "Ladino": "Rogue", 
                "Mago": "Mage", "Bruxo": "Warlock", "Sacerdote": "Priest", 
                "Druida": "Druid", "Xamã": "Shaman", "Paladino": "Paladin"
            };
            const raceMap = {
                "Orc": "Orc", "Troll": "Troll", "Taurem": "Tauren", "Tauren": "Tauren", 
                "Renegado": "Undead", "Morto-vivo": "Undead", "Undead": "Undead",
                "Humano": "Human", "Anão": "Dwarf", "Elfo Noturno": "Night Elf", "Gnomo": "Gnome"
            };

            const mappedClass = classMap[data.class] || data.class;
            const mappedRace = raceMap[data.race] || data.race;

            const classSelect = document.getElementById("class");
            const raceSelect = document.getElementById("race");
            
            if ([...classSelect.options].some(o => o.value === mappedClass)) classSelect.value = mappedClass;
            if ([...raceSelect.options].some(o => o.value === mappedRace)) raceSelect.value = mappedRace;

            document.getElementById("level").value = data.level;
            document.getElementById("guild").value = data.guild || "BRAZUG";
            
            // Só sobrescreve a imagem se estiver vazia
            const currentImg = document.getElementById("image_url").value;
            if (!currentImg && data.avatarUrl) {
                document.getElementById("image_url").value = data.avatarUrl;
            }
            
            // Populate professions
            let primaryCount = 0;
            data.professions.forEach((p) => {
                const name = p.name.toLowerCase();
                if (name.includes("culinária") || name.includes("cooking")) {
                    document.getElementById("prof_cooking_lvl").value = p.skillPoints;
                } else if (name.includes("primeiros socorros") || name.includes("first aid")) {
                    document.getElementById("prof_aid_lvl").value = p.skillPoints;
                } else if (name.includes("pesca") || name.includes("fishing")) {
                    document.getElementById("prof_fishing_lvl").value = p.skillPoints;
                } else if (primaryCount < 2) {
                    primaryCount++;
                    document.getElementById(`prof${primaryCount}_name`).value = p.name;
                    document.getElementById(`prof${primaryCount}_lvl`).value = p.skillPoints;
                }
            });
            
            alert("Dados carregados com sucesso!");
        } catch (e) {
            alert(e.message);
        }
    },

    initQuill() {
        if (!this.quill) {
            this.quill = new Quill('#lore-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['link', 'image'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                    ]
                }
            });
        }
    },

    async init() {
      this.initQuill();

      // Add event listener for fetch button
      document.getElementById("btn-fetch-wow").onclick = () => this.fetchFromWoW();
      
      const token = localStorage.getItem("brazug_admin_token");
      if (!token) return window.location.href = "/login.html";

      const username = localStorage.getItem("brazug_admin_user");
      const role = localStorage.getItem("brazug_admin_role");
      if (role === 'admin') document.getElementById('filter-owner').style.display = 'block';

      try {
        const chars = await CharacterModel.fetchAll(token);
        this.allChars = chars;
        this.render(chars, username, role);

        document.getElementById('filter-class').onchange = () => this.render(this.allChars, username, role);
        document.getElementById('filter-race').onchange = () => this.render(this.allChars, username, role);
        document.getElementById('filter-owner').oninput = () => this.render(this.allChars, username, role);
      } catch (e) {
        console.error(e);
      }
    },

    render(chars, username, role) {
      const classFilter = document.getElementById('filter-class').value;
      const raceFilter = document.getElementById('filter-race').value;
      const ownerFilter = document.getElementById('filter-owner').value.toLowerCase();

      let filtered = chars.filter(c => {
        const matchClass = !classFilter || c.class === classFilter;
        const matchRace = !raceFilter || c.race === raceFilter;
        const matchOwner = !ownerFilter || (c.owner_username && c.owner_username.toLowerCase().includes(ownerFilter));
        return matchClass && matchRace && matchOwner;
      });

      const alive = filtered.filter(c => !c.is_dead);
      const dead = filtered.filter(c => c.is_dead);

      CharacterView.renderList(alive, document.getElementById("character-list-alive"), username, role);
      CharacterView.renderList(dead, document.getElementById("character-list-dead"), username, role);
    },

    async edit(id) {
        const token = localStorage.getItem("brazug_admin_token");
        const chars = await CharacterModel.fetchAll(token);
        const char = chars.find(c => c.id === id);
        if (!char) return;

        // Subir a página para edição
        const formCard = document.getElementById("character-form-card");
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });

        // Preencher formulário (Campos Básicos)
        document.getElementById("name").value = char.name;
        document.getElementById("class").value = char.class;
        document.getElementById("race").value = char.race;
        document.getElementById("level").value = char.level;
        document.getElementById("guild").value = char.guild;
        document.getElementById("visibility").value = char.visibility;
        document.getElementById("status").value = char.is_dead ? "dead" : "alive";
        document.getElementById("image_url").value = char.image_url;
        
        if (this.quill) {
            this.quill.root.innerHTML = char.lore || "";
        }

        // Preencher Profissões
        document.getElementById("prof1_name").value = char.prof1_name || "";
        document.getElementById("prof1_lvl").value = char.prof1_lvl || 0;
        document.getElementById("prof2_name").value = char.prof2_name || "";
        document.getElementById("prof2_lvl").value = char.prof2_lvl || 0;
        document.getElementById("prof_cooking_lvl").value = char.prof_cooking_lvl || 0;
        document.getElementById("prof_aid_lvl").value = char.prof_aid_lvl || 0;
        document.getElementById("prof_fishing_lvl").value = char.prof_fishing_lvl || 0;
        
        // Redes Sociais
        document.getElementById("twitch_url").value = char.twitch_url || "";
        document.getElementById("youtube_url").value = char.youtube_url || "";
        
        // Mudar botão de salvar para update e mostrar cancelar
        const saveBtn = document.getElementById("btn-save");
        saveBtn.textContent = "Salvar Alterações";
        saveBtn.onclick = () => this.save(id);

        const cancelBtn = document.getElementById("btn-cancel-edit");
        if (cancelBtn) cancelBtn.style.display = "inline-block";
    },

    async save(id = null) {
      console.log("[DEBUG-FRONT] Botão Salvar clicado! ID:", id);
      const token = localStorage.getItem("brazug_admin_token");
      let imageUrl = document.getElementById("image_url").value;

      // Handle file upload if present
      const imageFile = document.getElementById("image_file").files[0];
      if (imageFile) {
          const upData = new FormData();
          upData.append("image", imageFile);
          try {
              const upRes = await fetch("/api/admin/upload", {
                  method: "POST",
                  headers: { "Authorization": "Bearer " + token },
                  body: upData
              });
              const upResData = await upRes.json();
              if (!upRes.ok) throw new Error(upResData.error || "Upload falhou");
              imageUrl = upResData.url;
          } catch (err) {
              return alert("Erro no upload: " + err.message);
          }
      }

      const char = {
          name: document.getElementById("name").value,
          class: document.getElementById("class").value,
          race: document.getElementById("race").value,
          level: parseInt(document.getElementById("level").value) || 1,
          guild: document.getElementById("guild").value,
          visibility: document.getElementById("visibility").value,
          is_dead: document.getElementById("status").value === "dead",
          image_url: imageUrl,
          lore: this.quill ? this.quill.root.innerHTML : "",
          
          // Profissões
          prof1_name: document.getElementById("prof1_name").value,
          prof1_lvl: parseInt(document.getElementById("prof1_lvl").value) || 0,
          prof2_name: document.getElementById("prof2_name").value,
          prof2_lvl: parseInt(document.getElementById("prof2_lvl").value) || 0,
          prof_cooking_lvl: parseInt(document.getElementById("prof_cooking_lvl").value) || 0,
          prof_aid_lvl: parseInt(document.getElementById("prof_aid_lvl").value) || 0,
          prof_fishing_lvl: parseInt(document.getElementById("prof_fishing_lvl").value) || 0,

          // Redes Sociais
          twitch_url: document.getElementById("twitch_url").value,
          youtube_url: document.getElementById("youtube_url").value
      };
      
      try {
        await CharacterModel.save(char, token, id);
        alert("Ficha salva!");
        location.reload();
      } catch (e) {
        alert("Erro ao salvar: " + e.message);
      }
    },

    async deleteCharacter(id) {
        if (!confirm("Tem certeza que deseja excluir este personagem?")) return;
        
        const token = localStorage.getItem("brazug_admin_token");
        try {
            const res = await fetch(`/api/characters/${id}`, {
                method: "DELETE",
                headers: { "Authorization": "Bearer " + token }
            });
            if (!res.ok) throw new Error("Erro ao excluir personagem");
            alert("Personagem excluído!");
            location.reload();
        } catch (e) {
            alert("Erro: " + e.message);
        }
    },

    view(id) {
        window.location.href = `/personagem.html?id=${id}`;
    }
  };

  root.CharacterController = CharacterController;
  document.addEventListener("DOMContentLoaded", () => {
    CharacterController.init();
    document.getElementById("btn-save").onclick = () => CharacterController.save();
  });
})(window);
