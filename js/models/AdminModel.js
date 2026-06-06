(function (root) {
  "use strict";

  const AdminModel = {
    async login(username, password) {
      return await this.api("/login", "POST", { username, password });
    },

    async fetchAdventures(token) {
      return await this.api("/adventures", "GET", null, token);
    },

    async fetchAdventure(id, token) {
      console.log(`[AdminModel] Fetching adventure: ${id}`);
      return await this.api("/adventures/" + id, "GET", null, token);
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

    async createUser(username, email, password, role, token) {
      return await this.api("/users", "POST", { username, email, password, role }, token);
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

      const url = "/api/admin" + path;
      try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          console.error(`[API ERROR] ${method} ${url} -> Status: ${res.status}`, data);
          throw new Error(data.error || `Erro ${res.status} na requisição`);
        }
        return data;
      } catch (err) {
        console.error(`[NETWORK ERROR] ${method} ${url}`, err);
        throw err;
      }
    }
  };

  root.AdminModel = AdminModel;
})(window);
