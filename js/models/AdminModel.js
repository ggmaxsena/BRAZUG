(function (root) {
  "use strict";

  const AdminModel = {
    async login(username, password) {
      return await this.api("/login", "POST", { username, password });
    },

    async fetchAdventures(token) {
      return await this.api("/adventures", "GET", null, token);
    },

    async updateAdventure(id, adventure, token) {
      return await this.api("/adventures/" + id, "PUT", adventure, token);
    },

    async deleteAdventure(id, token) {
      return await this.api("/adventures/" + id, "DELETE", null, token);
    },

    async updateUser(id, userData, token) {
      return await this.api("/users/" + id, "PUT", userData, token);
    },

    async createUser(username, password, role, token) {
      return await this.api("/users", "POST", { username, password, role }, token);
    },

    async fetchUsers(token) {
      return await this.api("/users", "GET", null, token);
    },

    async updateUserRole(id, role, token) {
      return await this.api("/users/" + id, "PUT", { role }, token);
    },

    async api(path, method, body, token) {
      const options = {
        method,
        headers: { "Content-Type": "application/json" }
      };
      if (token) options.headers["Authorization"] = "Bearer " + token;
      if (body) options.body = JSON.stringify(body);

      const res = await fetch("/api/admin" + path, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro na requisição");
      return data;
    }
  };

  root.AdminModel = AdminModel;
})(window);
