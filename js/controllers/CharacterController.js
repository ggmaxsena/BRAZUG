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

      CharacterView.renderList(filtered, document.getElementById("character-list"), username, role);
    },

    async edit(id) {
        const token = localStorage.getItem("brazug_admin_token");
        const chars = await CharacterModel.fetchAll(token);
        const char = chars.find(c => c.id === id);
        if (!char) return;

        // Preencher formulário
        document.getElementById("name").value = char.name;
        document.getElementById("class").value = char.class;
        document.getElementById("race").value = char.race;
        document.getElementById("level").value = char.level;
        document.getElementById("guild").value = char.guild;
        document.getElementById("visibility").value = char.visibility;
        document.getElementById("status").value = char.is_dead ? "dead" : "alive";
        document.getElementById("image_url").value = char.image_url;
        document.getElementById("lore").value = char.lore;
        
        // Mudar botão de salvar para update
        const saveBtn = document.getElementById("btn-save");
        saveBtn.textContent = "Salvar Alterações";
        saveBtn.onclick = () => this.save(id);
    },

    async save(id = null) {
      const token = localStorage.getItem("brazug_admin_token");
      const char = {
          name: document.getElementById("name").value,
          class: document.getElementById("class").value,
          race: document.getElementById("race").value,
          level: document.getElementById("level").value,
          guild: document.getElementById("guild").value,
          visibility: document.getElementById("visibility").value,
          is_dead: document.getElementById("status").value === "dead",
          image_url: document.getElementById("image_url").value,
          lore: document.getElementById("lore").value
      };
      
      await CharacterModel.save(char, token, id);
      alert("Ficha salva!");
      location.reload();
    }
  };

  root.CharacterController = CharacterController;
  document.addEventListener("DOMContentLoaded", () => {
    CharacterController.init();
    document.getElementById("btn-save").onclick = () => CharacterController.save();
  });
})(window);
