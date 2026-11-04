(function (root) {
  "use strict";

  const CharacterController = {
    quill: null,
    allChars: [],

    // ==========================================================
    // GERENCIAMENTO DE FICHAS (ficha.html)
    // ==========================================================

    async initManage() {
      this.initQuill();

      // Toggle do formulário
      const btnShowForm = document.getElementById("btn-show-form");
      const formContainer = document.getElementById("form-container");
      if (btnShowForm && formContainer) {
        btnShowForm.onclick = () => {
          formContainer.style.display = "block";
          btnShowForm.parentElement.style.display = "none";
          formContainer.scrollIntoView({ behavior: "smooth" });
        };
      }

      // Botão de busca/sincronização da Blizzard
      const btnFetchWoW = document.getElementById("btn-fetch-wow");
      if (btnFetchWoW) btnFetchWoW.onclick = () => this.fetchFromWoW();

      let token = localStorage.getItem("brazug_admin_token");
      if (!token || token === "session") {
        try {
          const me = await fetch("/api/auth/me");
          if (!me.ok) return window.location.href = "/login.html";
          const meData = await me.json();
          localStorage.setItem("brazug_admin_token", "session");
          localStorage.setItem("brazug_admin_user", meData.user.username);
          localStorage.setItem("brazug_admin_role", meData.user.role);
          token = "session";
        } catch (err) {
          return window.location.href = "/login.html";
        }
      }

      const username = localStorage.getItem("brazug_admin_user");
      const role = localStorage.getItem("brazug_admin_role");

      const filterOwner = document.getElementById("filter-owner");
      if (filterOwner) filterOwner.style.display = role === "admin" ? "block" : "none";

      const saveBtn = document.getElementById("btn-save");
      if (saveBtn) saveBtn.onclick = () => this.save();

      const cancelBtn = document.getElementById("btn-cancel-edit");
      if (cancelBtn) cancelBtn.onclick = () => window.location.reload();

      try {
        const chars = await CharacterModel.fetchAll(token);
        this.allChars = chars;
        this.render(chars, username, role);

        const filterClass = document.getElementById("filter-class");
        const filterRace = document.getElementById("filter-race");
        if (filterClass) filterClass.onchange = () => this.render(this.allChars, username, role);
        if (filterRace) filterRace.onchange = () => this.render(this.allChars, username, role);
        if (filterOwner) filterOwner.oninput = () => this.render(this.allChars, username, role);
      } catch (e) {
        console.error(e);
      }
    },

    initQuill() {
      if (!this.quill) {
        this.quill = new Quill("#lore-editor", {
          theme: "snow",
          modules: {
            toolbar: [
              [{ "header": [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              ["link", "image"],
              [{ "list": "ordered" }, { "list": "bullet" }],
              ["clean"]
            ]
          }
        });
      }
    },

    async fetchFromWoW() {
      const name = document.getElementById("wow-name").value.trim();
      const realm = document.getElementById("wow-realm").value.trim();
      if (!name || !realm) return alert("Preencha Nome e Reino");

      try {
        const data = await CharacterModel.fetchWoWCharacter(realm, name);
        this.applyWoWData(data);
        alert("Dados carregados com sucesso!");
      } catch (e) {
        alert(e.message);
      }
    },

    applyWoWData(data) {
      // Dados vindos da Blizzard API = Classic Era (Doomhowl)
      const realmSelect = document.getElementById("realm");
      if (realmSelect) realmSelect.value = "doomhowl";

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
      (data.professions || []).forEach((p) => {
        const name = p.name.toLowerCase();
        const sp = p.skillPoints !== undefined ? p.skillPoints : p.skill_points;
        if (name.includes("culinária") || name.includes("cooking")) {
          document.getElementById("prof_cooking_lvl").value = sp;
        } else if (name.includes("primeiros socorros") || name.includes("first aid")) {
          document.getElementById("prof_aid_lvl").value = sp;
        } else if (name.includes("pesca") || name.includes("fishing")) {
          document.getElementById("prof_fishing_lvl").value = sp;
        } else if (primaryCount < 2) {
          primaryCount++;
          document.getElementById(`prof${primaryCount}_name`).value = p.name;
          document.getElementById(`prof${primaryCount}_lvl`).value = sp;
        }
      });
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

      const myChars = filtered.filter(c => c.owner_username === username && !c.is_dead);
      const othersChars = filtered.filter(c => c.owner_username !== username && !c.is_dead);
      const deadChars = filtered.filter(c => c.is_dead);

      document.getElementById("my-characters-section").style.display = myChars.length ? "block" : "none";
      document.getElementById("all-characters-section").style.display = othersChars.length ? "block" : "none";
      document.getElementById("cemetery-section").style.display = deadChars.length ? "block" : "none";

      CharacterView.renderList(myChars, document.getElementById("my-characters-list"), username, role);
      CharacterView.renderList(othersChars, document.getElementById("all-characters-list"), username, role);
      CharacterView.renderList(deadChars, document.getElementById("cemetery-list"), username, role);
    },

    async edit(id) {
      const token = localStorage.getItem("brazug_admin_token");
      const chars = await CharacterModel.fetchAll(token);
      const char = chars.find(c => c.id === id);
      if (!char) return;

      // Mostrar o formulário caso esteja escondido
      const formContainer = document.getElementById("form-container");
      const btnShowForm = document.getElementById("btn-show-form");
      if (formContainer) formContainer.style.display = "block";
      if (btnShowForm) btnShowForm.parentElement.style.display = "none";

      // Subir a página para edição
      const formCard = document.getElementById("character-form-card");
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });

      this.fillForm(char);

      // Mudar botão de salvar para update e mostrar cancelar
      const saveBtn = document.getElementById("btn-save");
      saveBtn.textContent = "Salvar Alterações";
      saveBtn.onclick = () => this.save(id);

      const cancelBtn = document.getElementById("btn-cancel-edit");
      if (cancelBtn) cancelBtn.style.display = "inline-block";
    },

    fillForm(char) {
      document.getElementById("name").value = char.name;
      document.getElementById("class").value = char.class;
      document.getElementById("race").value = char.race;
      document.getElementById("level").value = char.level;
      document.getElementById("guild").value = char.guild;
      document.getElementById("visibility").value = char.visibility;

      const realmSelect = document.getElementById("realm");
      if (realmSelect) realmSelect.value = char.realm || "doomhowl";

      const statusSelect = document.getElementById("status");
      statusSelect.value = char.is_dead ? "dead" : "alive";
      statusSelect.className = statusSelect.value === "dead" ? "status-dead" : "status-alive";

      document.getElementById("image_url").value = char.image_url || "";

      if (this.quill) {
        this.quill.root.innerHTML = char.lore || "";
      }

      // Profissões
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
      document.getElementById("video_url").value = char.video_url || "";
      this.fillSheet(char.sheet || {});
    },

    readSheet() {
      const v = (id) => ((document.getElementById(id) || {}).value || "").trim();
      return {
        appearance: v("sheet_appearance"),
        background: v("sheet_background"),
        personality: v("sheet_personality"),
        ideals: v("sheet_ideals"),
        bonds: v("sheet_bonds"),
        flaws: v("sheet_flaws")
      };
    },

    fillSheet(s) {
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
      };
      set("sheet_appearance", s.appearance);
      set("sheet_background", s.background);
      set("sheet_personality", s.personality);
      set("sheet_ideals", s.ideals);
      set("sheet_bonds", s.bonds);
      set("sheet_flaws", s.flaws);
    },

    buildCharacter(imageUrl) {
      const name = document.getElementById("name").value.trim();
      const charClass = document.getElementById("class").value;
      const race = document.getElementById("race").value;

      if (!name) throw new Error("O nome do personagem é obrigatório.");
      if (!charClass) throw new Error("A classe do personagem é obrigatória.");
      if (!race) throw new Error("A raça do personagem é obrigatória.");

      return {
        name: name,
        class: charClass,
        race: race,
        level: parseInt(document.getElementById("level").value) || 1,
        guild: document.getElementById("guild").value,
        realm: (document.getElementById("realm") || {}).value || "doomhowl",
        visibility: document.getElementById("visibility").value,
        is_dead: document.getElementById("status").value === "dead",
        image_url: imageUrl || "",
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
        youtube_url: document.getElementById("youtube_url").value,
        video_url: document.getElementById("video_url").value,
        sheet: this.readSheet()
      };
    },

    async save(id = null) {
      const token = localStorage.getItem("brazug_admin_token");
      let imageUrl = document.getElementById("image_url").value;

      // Handle file upload if present
      const imageFile = document.getElementById("image_file").files[0];
      if (imageFile) {
        try {
          const upData = await CharacterModel.uploadImage(token, imageFile);
          imageUrl = upData.url;
        } catch (err) {
          return alert("Erro no upload: " + err.message);
        }
      }

      let char;
      try {
        char = this.buildCharacter(imageUrl);
      } catch (e) {
        return alert(e.message);
      }

      try {
        await CharacterModel.save(char, token, id);
        alert("Ficha salva com sucesso!");
        location.reload();
      } catch (e) {
        alert("Erro ao salvar: " + e.message);
      }
    },

    async deleteCharacter(id) {
      if (!confirm("Tem certeza que deseja excluir este personagem?")) return;

      const token = localStorage.getItem("brazug_admin_token");
      try {
        await CharacterModel.delete(id, token);
        alert("Personagem excluído!");
        location.reload();
      } catch (e) {
        alert("Erro: " + e.message);
      }
    },

    view(id) {
      window.location.href = `/personagem.html?id=${id}`;
    },

    // ==========================================================
    // FICHA PÚBLICA — Detalhe do herói (personagem.html)
    // ==========================================================

    async initDetail() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const name = params.get("name");
      const container = document.getElementById("hero-detail");

      if (!id && !name) {
        if (container) container.innerHTML = '<p style="text-align:center; color:#888;">Herói não especificado.</p>';
        return;
      }

      try {
        const token = localStorage.getItem("brazug_admin_token");
        const char = id ? await CharacterModel.fetchById(id, token) : await CharacterModel.search(name);

        // Reputation (com fallback silencioso)
        let data = char;
        try {
          const reputation = await CharacterModel.fetchReputation(char.id, token);
          if (reputation) data = { ...char, reputation };
        } catch (e) {
          console.warn("Reputation fetch failed", e);
        }

        const username = localStorage.getItem("brazug_admin_user");
        const role = localStorage.getItem("brazug_admin_role");
        const isOwner = !!(
          username &&
          char.owner_username &&
          String(char.owner_username).toLowerCase() === String(username).toLowerCase()
        );
        const canManage = isOwner || role === "admin";

        CharacterView.renderDetail(data, container, { canManage });
      } catch (e) {
        console.error(e);
        if (container) container.innerHTML = `<p style="text-align:center; color:#888;">${e.message}</p>`;
      }
    }
  };

  root.CharacterController = CharacterController;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("form-container")) {
      CharacterController.initManage();
    } else if (document.getElementById("hero-detail")) {
      CharacterController.initDetail();
    }
  });
})(window);
