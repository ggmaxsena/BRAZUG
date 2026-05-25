(function (root) {
  "use strict";

  const CharacterController = {
    async init() {
      const token = localStorage.getItem("brazug_admin_token");
      if (!token) return window.location.href = "/login.html";

      try {
        const chars = await CharacterModel.fetchAll(token);
        CharacterView.renderList(chars, document.getElementById("character-list"));
      } catch (e) {
        console.error(e);
      }
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
