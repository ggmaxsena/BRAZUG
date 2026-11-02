"use strict";

/**
 * Cliente de streams do bot.
 * 
 * IMPORTANTE: o bot NÃO fala com a Twitch diretamente e NÃO precisa
 * de credenciais da Twitch. O backend BRAZUG já lista as streams com a
 * tag <BRAZUG> em GET /api/live-streams (com cache próprio de 2 min).
 * O bot apenas consome esse endpoint.
 */

const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

let lastKnownLogins = null; // undefined = primeira execução (não notifica tudo)

/**
 * Busca streams ao vivo listadas pelo backend.
 * Retorna: [{ login, displayName, title, viewers, url, thumbnailUrl, gameName }]
 */
async function getLiveStreams() {
  const response = await fetch(`${SITE_URL}/api/live-streams`);
  if (!response.ok) {
    throw new Error(`Backend respondeu ${response.status}`);
  }
  const data = await response.json();
  return data.streams || [];
}

/**
 * Primeira execução não notifica (só estabelece baseline).
 */
function hasBaseline() {
  return lastKnownLogins !== null;
}

/**
 * Compara com o snapshot anterior e retorna apenas streams que FICARAM ONLINE agora.
 */
function detectNewOnline(streams) {
  const current = new Map(streams.map((s) => [s.login, s]));
  const previous = lastKnownLogins || new Map();
  lastKnownLogins = current;

  const fresh = [];
  for (const [login, stream] of current) {
    if (!previous.has(login)) fresh.push(stream);
  }
  return fresh;
}

module.exports = { getLiveStreams, detectNewOnline, hasBaseline };
