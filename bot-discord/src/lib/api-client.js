"use strict";

const API_BASE_URL = process.env.ADMIN_API_BASE_URL || "http://localhost:3000/api/v1/admin";
const API_KEY = process.env.ADMIN_API_KEY || "";

/**
 * Cliente HTTP para a API admin do backend
 */

// Ator atual (definido pelo index.js a cada interação) para rastreabilidade no audit log
let currentActor = null;

function setActor(user) {
  currentActor = user ? { id: user.id, name: user.tag || user.username } : null;
}

async function apiRequest(method, path, body = null) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };

  // Identifica quem executou a ação (para o audit log registrar o admin real)
  if (currentActor) {
    headers["X-Actor-Id"] = currentActor.id;
    headers["X-Actor-Name"] = encodeURIComponent(currentActor.name);
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

module.exports = {
  setActor,

  // Auth / Cadastro
  register: (data) => apiRequest("POST", "/register", data),

  // Users
  listUsers: (page = 1, limit = 20, search = "") =>
    apiRequest("GET", `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  createUser: (data) => apiRequest("POST", "/users", data),
  banUser: (id, reason) => apiRequest("POST", `/users/${id}/ban`, { reason }),
  unbanUser: (id) => apiRequest("DELETE", `/users/${id}/ban`),

  // Events
  listEvents: (guildId) => apiRequest("GET", `/events?guild_id=${guildId}`),
  createEvent: (data) => apiRequest("POST", "/events", data),
  updateEvent: (id, data) => apiRequest("PUT", `/events/${id}`, data),
  deleteEvent: (id) => apiRequest("DELETE", `/events/${id}`),

  // Sales
  listSales: (guildId) => apiRequest("GET", `/sales?guild_id=${guildId}`),
  createSale: (data) => apiRequest("POST", "/sales", data),
  deleteSale: (id) => apiRequest("DELETE", `/sales/${id}`),

  // Announcements
  listAnnouncements: (guildId, limit = 10) => apiRequest("GET", `/announcements?guild_id=${guildId}&limit=${limit}`),
  createAnnouncement: (data) => apiRequest("POST", "/announcements", data),
  deleteAnnouncement: (id) => apiRequest("DELETE", `/announcements/${id}`),

  // Audit
  listAuditLogs: (guildId, limit = 50) => apiRequest("GET", `/audit-log?guild_id=${guildId}&limit=${limit}`),

  // Stats
  getStats: (guildId) => apiRequest("GET", `/stats?guild_id=${guildId}`),

  // Settings
  getSettings: (guildId) => apiRequest("GET", `/settings?guild_id=${guildId}`),
  updateSettings: (data) => apiRequest("PUT", "/settings", data),

  // Permissions
  listPermissions: (guildId) => apiRequest("GET", `/permissions?guild_id=${guildId}`),
  grantPermission: (data) => apiRequest("POST", "/permissions", data),
  revokePermission: (data) => apiRequest("DELETE", "/permissions", data),

  // Guilds
  createGuild: (data) => apiRequest("POST", "/guilds", data),
  getGuild: (guildId) => apiRequest("GET", `/guilds/${guildId}`),
};
