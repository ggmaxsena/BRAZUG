(function (root) {
  "use strict";

  const ProfileModel = {
    async updatePassword(oldPassword, newPassword, token) {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },

    async fetchMyAdventures(token) {
      const res = await fetch("/api/admin/adventures", {
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await res.json();
      return data.adventures || [];
    }
  };

  root.ProfileModel = ProfileModel;
})(window);
