(function (root) {
  "use strict";

  const CharacterController = {
    async init() {
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
        document.getElementById("lore").value = char.lore;

        // Preencher Profissões
        document.getElementById("prof1_name").value = char.prof1_name || "";
        document.getElementById("prof1_lvl").value = char.prof1_lvl || 0;
        document.getElementById("prof2_name").value = char.prof2_name || "";
        document.getElementById("prof2_lvl").value = char.prof2_lvl || 0;
        document.getElementById("prof_cooking_lvl").value = char.prof_cooking_lvl || 0;
        document.getElementById("prof_aid_lvl").value = char.prof_aid_lvl || 0;
        document.getElementById("prof_fishing_lvl").value = char.prof_fishing_lvl || 0;
        
        // Mudar botão de salvar para update e mostrar cancelar
        const saveBtn = document.getElementById("btn-save");
        saveBtn.textContent = "Salvar Alterações";
        saveBtn.onclick = () => this.save(id);

        const cancelBtn = document.getElementById("btn-cancel-edit");
        if (cancelBtn) cancelBtn.style.display = "inline-block";
    },

    async save(id = null) {
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
          lore: document.getElementById("lore").value,
          
          // Profissões
          prof1_name: document.getElementById("prof1_name").value,
          prof1_lvl: parseInt(document.getElementById("prof1_lvl").value) || 0,
          prof2_name: document.getElementById("prof2_name").value,
          prof2_lvl: parseInt(document.getElementById("prof2_lvl").value) || 0,
          prof_cooking_lvl: parseInt(document.getElementById("prof_cooking_lvl").value) || 0,
          prof_aid_lvl: parseInt(document.getElementById("prof_aid_lvl").value) || 0,
          prof_fishing_lvl: parseInt(document.getElementById("prof_fishing_lvl").value) || 0
      };
      
      try {
        await CharacterModel.save(char, token, id);
        alert("Ficha salva!");
        location.reload();
      } catch (e) {
        alert("Erro ao salvar: " + e.message);
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
