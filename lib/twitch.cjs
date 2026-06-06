"use strict";

const TAG = "<BRAZUG>";
// IDs: 21703 (Retail), 18122 (Classic), 1122165802 (SoD/Era), 493057 (Classic HC/Era)
const WOW_GAME_IDS = ["21703", "18122", "1122165802", "493057"];

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
  // Retorna cache se válido
  if (streamsCache && Date.now() < streamsCacheExpiresAt) {
    return streamsCache;
  }

  const { token, clientId } = await getAppAccessToken();
  const byLogin = new Map();

  // Scan mais profundo para garantir que ninguém seja deixado para trás
  const scanConfigurations = [
    { language: "pt", pages: 10 }, // Scaneia até 1000 streams em PT (cobre absolutamente tudo em PT)
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
          if (!titleHasBrazugTag(s.title)) continue;
          
          const login = (s.user_login || s.user_name || "").toLowerCase();
          if (!login || byLogin.has(login)) continue;

          byLogin.set(login, {
            login,
            displayName: s.user_name,
            title: s.title,
            viewers: s.viewer_count || 0,
            url: `https://www.twitch.tv/${login}`,
            thumbnailUrl: (s.thumbnail_url || "")
              .replace("{width}", "440")
              .replace("{height}", "248"),
            gameName: s.game_name || "",
          });
        }

        cursor = body.pagination?.cursor;
        if (!cursor) break;
      } catch (e) {
        console.error(`[Twitch] Erro no scan (lang: ${config.language}):`, e.message);
        break; 
      }
    }
  }

  // Passagem 3: Busca Global por Palavra-Chave (Captura quem esqueceu o jogo ou está sem categoria)
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
        // Valida se a tag está no título (mesmo critério dos outros scans)
        if (!titleHasBrazugTag(s.title)) continue;
        
        const login = (s.broadcaster_login || s.display_name || "").toLowerCase();
        // Se já achamos pelo scan de WoW, não duplica
        if (!login || byLogin.has(login)) continue;

        byLogin.set(login, {
          login,
          displayName: s.display_name,
          title: s.title,
          viewers: 0, // O endpoint de busca não dá viewers precisos, mas garante a descoberta
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
  
  // Atualiza cache
  streamsCache = result;
  streamsCacheExpiresAt = Date.now() + CACHE_DURATION_MS;

  return result;
}

function liveStreamsPayload(streams) {
  return { streams, tag: TAG, updatedAt: Date.now() };
}

module.exports = {
  TAG,
  collectBrazugStreams,
  liveStreamsPayload,
};
