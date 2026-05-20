"use strict";

const TAG = "<BRAZUG>";
const WOW_GAME_IDS = ["18122", "1122165802", "493057"];

let cachedToken = null;
let tokenExpiresAt = 0;

function titleHasBrazugTag(title) {
  if (!title) return false;
  const upper = title.toUpperCase();
  return upper.includes(TAG) || upper.includes("BRAZUG");
}

async function getAppAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Configure TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET no painel Hostinger"
    );
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
  if (!res.ok) {
    throw new Error("Falha ao obter token Twitch (" + res.status + ")");
  }
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return { token: cachedToken, clientId };
}

async function fetchStreamsPage(gameId, cursor, token, clientId) {
  const params = new URLSearchParams({ first: "100", game_id: gameId });
  if (cursor) params.set("after", cursor);
  const res = await fetch(
    "https://api.twitch.tv/helix/streams?" + params.toString(),
    {
      headers: {
        "Client-Id": clientId,
        Authorization: "Bearer " + token,
      },
    }
  );
  if (!res.ok) throw new Error("Twitch API streams (" + res.status + ")");
  return res.json();
}

async function collectBrazugStreams() {
  const { token, clientId } = await getAppAccessToken();
  const byLogin = new Map();
  for (const gameId of WOW_GAME_IDS) {
    let cursor = null;
    for (let page = 0; page < 8; page++) {
      const body = await fetchStreamsPage(gameId, cursor, token, clientId);
      for (const s of body.data || []) {
        if (!titleHasBrazugTag(s.title)) continue;
        const login = (s.user_login || s.user_name || "").toLowerCase();
        if (!login || byLogin.has(login)) continue;
        byLogin.set(login, {
          login,
          displayName: s.user_name,
          title: s.title,
          viewers: s.viewer_count || 0,
          url: "https://www.twitch.tv/" + login,
          thumbnailUrl: (s.thumbnail_url || "")
            .replace("{width}", "440")
            .replace("{height}", "248"),
          gameName: s.game_name || "",
        });
      }
      cursor = body.pagination && body.pagination.cursor;
      if (!cursor) break;
    }
  }
  return [...byLogin.values()].sort((a, b) => b.viewers - a.viewers);
}

function liveStreamsPayload(streams) {
  return { streams, tag: TAG, updatedAt: Date.now() };
}

module.exports = {
  TAG,
  collectBrazugStreams,
  liveStreamsPayload,
};
