(function (root) {
  "use strict";

  const ProfileView = {
    renderInfo(username, role) {
      const uEl = document.getElementById("profile-username");
      const rEl = document.getElementById("profile-role");
      if (uEl) uEl.textContent = username;
      if (rEl) rEl.textContent = role.toUpperCase();
    },

    renderAdventures(adventures, username) {
      const listEl = document.getElementById("user-adventures-list");
      if (!listEl) return;
      
      const filtered = adventures.filter(a => 
        a.author && a.author.toLowerCase().includes(username.toLowerCase())
      );

      listEl.innerHTML = filtered.map(a => `
        <li>${this.escape(a.title)} (${a.event_date})</li>
      `).join("") || '<li>Nenhuma aventura cadastrada por você.</li>';
    },

    showPasswordMessage(msg, isError) {
      const msgEl = document.getElementById("password-msg");
      if (!msgEl) return;
      msgEl.textContent = msg;
      msgEl.style.color = isError ? "#e07a6a" : "#2d6a3e";
      msgEl.hidden = false;
    },

    escape(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  };

  root.ProfileView = ProfileView;
})(window);
