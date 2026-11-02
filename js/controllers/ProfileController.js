(function () {
  "use strict";

  const ProfileController = {
    async init() {
      let username = localStorage.getItem("brazug_admin_user");
      let role = localStorage.getItem("brazug_admin_role");
      let token = localStorage.getItem("brazug_admin_token");

      if (!username || !token || token === "session") {
        try {
          const me = await fetch("/api/auth/me");
          if (!me.ok) return window.location.href = "/login.html";
          const meData = await me.json();
          username = meData.user.username;
          role = meData.user.role;
          token = "session";
          localStorage.setItem("brazug_admin_token", token);
          localStorage.setItem("brazug_admin_user", username);
          localStorage.setItem("brazug_admin_role", role);
        } catch (err) {
          return window.location.href = "/login.html";
        }
      }

      ProfileView.renderInfo(username, role);

      if (["admin", "guildmaster", "officer"].includes(role)) {
        const adminActions = document.getElementById("admin-actions");
        if (adminActions) adminActions.hidden = false;
      }

      try {
        const adventures = await ProfileModel.fetchMyAdventures(token);
        ProfileView.renderAdventures(adventures, username);
      } catch (e) { console.error(e); }

      document.getElementById("password-form").addEventListener("submit", (e) => this.handlePasswordChange(e, token));
    },

    async handlePasswordChange(e, token) {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);

      if (data.newPassword !== data.confirmPassword) {
        return ProfileView.showPasswordMessage("As senhas não coincidem.", true);
      }

      try {
        await ProfileModel.updatePassword(data.oldPassword, data.newPassword, token);
        ProfileView.showPasswordMessage("Senha alterada com sucesso!", false);
        form.reset();
      } catch (e) {
        ProfileView.showPasswordMessage(e.message, true);
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => ProfileController.init());
})();
