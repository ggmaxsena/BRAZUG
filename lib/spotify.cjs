"use strict";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `${process.env.BASE_URL}/api/spotify/auth/callback`;

/**
 * Gera a URL de autorização do Spotify
 */
function getAuthUrl() {
  const scopes = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing"
  ];
  
  return `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scopes.join(" "))}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
}

/**
 * Troca o código de autorização por tokens
 */
async function exchangeCode(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || "Falha ao trocar código Spotify");
  }

  return res.json();
}

/**
 * Atualiza um access token usando o refresh token
 */
async function refreshToken(refreshToken) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || "Falha ao atualizar token Spotify");
  }

  return res.json();
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshToken
};
