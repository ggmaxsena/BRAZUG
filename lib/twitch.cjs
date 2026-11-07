"use strict";

const db = require("./db.cjs");

const TAG = "<BRAZUG>";
const BLACKLIST_SETTING_KEY = "stream_blacklist";
const RESERVED_TWITCH_PATHS = new Set([
  "videos", "directory", "search", "downloads", "subscriptions",
  "inventory", "wallet", "drops", "settings", "friends", "turbo"
]);
// IDs: 21703 (Retail), 18122 (Classic), 1122165802 (SoD/Era), 493057 (Classic HC/Era), 47893650 (World of Warcraft: Forever), 509577 (Dungeons & Dragons), 512923 (Baldur's Gate 3)
const WOW_GAME_IDS = ["21703", "18122", "1122165802", "493057", "47893650", "509577", "512923"];

let cachedToken = null;
let tokenExpiresAt = 0;

let streamsCache = null;
let streamsCacheExpiresAt = 0;
const CACHE_DURATION_MS = 120_000; // 2 minutos

function titleHasBrazugTag(title) {
  if (!title) return false;
  const upper = title.toUpperCase();
  return upper.includes(TAG) || upper.includes("BRAZUG");
}

function normalizeStreamEntry(value) {
  let entry = String(value || "").trim();
  if (!entry) return "";

  const looksLikeUrl = /^https?:\/\//i.test(entry) || /(^|\.)twitch\.tv(\/|$)/i.test(entry);
  if (!looksLikeUrl) {
    // Login ou nome de canal puro.
    return entry.replace(/^@/, "").toLowerCase();
  }

  // Aceita "twitch.tv/canal" sem protocolo.
  if (!/^https?:\/\//i.test(entry)) {
    entry = "https://" + entry.replace(/^\/+/, "");
  }

  try {
    const url = new URL(entry);
    if (/(^|\.)twitch\.tv$/i.test(url.hostname)) {
      const channelParam = url.searchParams.get("channel") || "";
      const segments = url.pathname.split("/").filter(Boolean);
      const login = (channelParam || segments[0] || "").trim().replace(/^@/, "").toLowerCase();
      // Links de VOD, diretório etc. não são canais.
      if (!channelParam && RESERVED_TWITCH_PATHS.has(login)) return "";
      return login;
    }
  } catch (e) {
    // URL inválida: ignora a entrada.
  }

  return "";
}

function parseStreamBlacklist(raw) {
  if (!raw) return new Set();
  const entries = String(raw)
    .split(/[\r\n,;]+/)
    .map(normalizeStreamEntry)
    .filter(Boolean);
  return new Set(entries);
}

async function getStreamBlacklist() {
  try {
    const raw = await db.getSetting(BLACKLIST_SETTING_KEY);
    return parseStreamBlacklist(raw);
  } catch (e) {
    console.error("[Twitch] Falha ao carregar blacklist:", e.message);
    return new Set();
  }
}

function isBlacklisted(stream, blacklist) {
  if (!blacklist || blacklist.size === 0) return false;
  if (blacklist.has(stream.login)) return true;
  const displayName = String(stream.displayName || "").toLowerCase();
  return Boolean(displayName) && blacklist.has(displayName);
}

function filterBlacklisted(streams, blacklist) {
  if (!blacklist || blacklist.size === 0) return streams;
  return streams.filter((stream) => !isBlacklisted(stream, blacklist));
}

async function getAppAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("Configure TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET");
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return { token: cachedToken, clientId };
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) throw new Error("Falha ao obter token Twitch");

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return { token: cachedToken, clientId };
}

async function fetchStreamsPage(gameId, cursor, token, clientId) {
  const params = new URLSearchParams({ first: "100", game_id: gameId });
  if (cursor) params.set("after", cursor);
  
  const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
    headers: {
      "Client-Id": clientId,
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(`Twitch API error: ${res.status}`);
  return res.json();
}

async function collectBrazugStreams() {
  // A blacklist é aplicada na saída (inclusive no cache), então mudanças
  // feitas no admin valem imediatamente.
  const blacklist = await getStreamBlacklist();

  // Retorna cache se válido
  if (streamsCache && Date.now() < streamsCacheExpiresAt) {
    return filterBlacklisted(streamsCache, blacklist);
  }

  const { token, clientId } = await getAppAccessToken();
  const byLogin = new Map();

  const addStream = (s) => {
    if (!titleHasBrazugTag(s.title)) return;
    const login = (s.user_login || s.broadcaster_login || s.user_name || "").toLowerCase();
    if (!login || byLogin.has(login)) return;

    byLogin.set(login, {
      login,
      displayName: s.user_name || s.display_name,
      title: s.title,
      viewers: s.viewer_count || 0,
      url: `https://www.twitch.tv/${login}`,
      thumbnailUrl: (s.thumbnail_url || "")
        .replace("{width}", "440")
        .replace("{height}", "248"),
      gameName: s.game_name || "",
    });
  };

  // 1. Scan prioritário e dedicado na categoria "World of Warcraft: Forever" (47893650)
  try {
    let cursor = null;
    for (let page = 0; page < 3; page++) {
      const params = new URLSearchParams({ first: "100", game_id: "47893650" });
      if (cursor) params.set("after", cursor);

      const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
        headers: {
          "Client-Id": clientId,
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) break;
      const body = await res.json();
      if (!body.data || body.data.length === 0) break;

      for (const s of body.data) {
        addStream(s);
      }

      cursor = body.pagination?.cursor;
      if (!cursor) break;
    }
  } catch (e) {
    console.error("[Twitch] Erro no scan de WoW Forever:", e.message);
  }

  // 2. Scan nas categorias de WoW (PT e Global)
  const scanConfigurations = [
    { language: "pt", pages: 10 }, // Scaneia até 1000 streams em PT
    { language: null, pages: 10 }  // Scaneia as top 1000 globais
  ];

  for (const config of scanConfigurations) {
    let cursor = null;
    for (let page = 0; page < config.pages; page++) {
      try {
        const params = new URLSearchParams({ first: "100" });
        if (cursor) params.set("after", cursor);
        if (config.language) params.set("language", config.language);
        
        // Passamos múltiplos IDs de uma vez para maior eficiência
        WOW_GAME_IDS.forEach(id => params.append("game_id", id));

        const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
          headers: {
            "Client-Id": clientId,
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) break;
        const body = await res.json();
        if (!body.data || body.data.length === 0) break;

        for (const s of body.data) {
          addStream(s);
        }

        cursor = body.pagination?.cursor;
        if (!cursor) break;
      } catch (e) {
        console.error(`[Twitch] Erro no scan (lang: ${config.language}):`, e.message);
        break; 
      }
    }
  }

  // 3. Busca Global por Palavra-Chave (Captura quem esqueceu o jogo ou está sem categoria)
  try {
    // query "brazug" com live_only=true vasculha a Twitch inteira por esse texto
    const searchParams = new URLSearchParams({ query: "brazug", live_only: "true", first: "100" });
    const searchRes = await fetch(`https://api.twitch.tv/helix/search/channels?${searchParams}`, {
      headers: {
        "Client-Id": clientId,
        "Authorization": `Bearer ${token}`,
      },
    });

    if (searchRes.ok) {
      const searchBody = await searchRes.json();
      for (const s of (searchBody.data || [])) {
        if (!titleHasBrazugTag(s.title)) continue;
        
        const login = (s.broadcaster_login || s.display_name || "").toLowerCase();
        if (!login || byLogin.has(login)) continue;

        byLogin.set(login, {
          login,
          displayName: s.display_name,
          title: s.title,
          viewers: 0,
          url: `https://www.twitch.tv/${login}`,
          thumbnailUrl: (s.thumbnail_url || "")
            .replace("{width}", "440")
            .replace("{height}", "248"),
          gameName: s.game_name || "Nenhum jogo declarado",
        });
      }
    }
  } catch (e) {
    console.error("[Twitch] Erro na Busca Global:", e.message);
  }

  const result = [...byLogin.values()].sort((a, b) => b.viewers - a.viewers);
  
  // Atualiza cache com a lista completa; a blacklist é aplicada na leitura.
  streamsCache = result;
  streamsCacheExpiresAt = Date.now() + CACHE_DURATION_MS;

  return filterBlacklisted(result, blacklist);
}

function liveStreamsPayload(streams) {
  return { streams, tag: TAG, updatedAt: Date.now() };
}

module.exports = {
  TAG,
  collectBrazugStreams,
  liveStreamsPayload,
  parseStreamBlacklist,
};
