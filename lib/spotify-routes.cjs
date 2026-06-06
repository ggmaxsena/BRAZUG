"use strict";

const express = require("express");
const spotify = require("./spotify.cjs");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createSpotifyRouter() {
  const router = express.Router();

  /**
   * Retorna a URL para o usuário autorizar o Spotify
   */
  router.get("/auth-url", (req, res) => {
    res.json({ url: spotify.getAuthUrl() });
  });

  /**
   * Callback do Spotify após autorização
   */
  router.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    
    // Opcional: Validar state para evitar CSRF
    
    try {
      const tokens = await spotify.exchangeCode(code);
      
      // Se o usuário estiver logado no Brazug, salva o refresh token dele
      // Caso contrário, apenas retorna os tokens (ou lida com isso no frontend)
      // Como o redirect vem do Spotify, o token JWT do Brazug pode estar nos cookies ou precisamos dele via query
      
      // SOLUÇÃO: O frontend abre uma janela pop-up para o Spotify.
      // Quando o callback acontece, esta rota envia uma mensagem para a janela pai.
      
      res.send(`
        <script>
          window.opener.postMessage({
            type: 'SPOTIFY_AUTH_SUCCESS',
            tokens: ${JSON.stringify(tokens)}
          }, "*");
          window.close();
        </script>
      `);
    } catch (err) {
      console.error("[Spotify Callback Error]", err.message);
      res.status(500).send("Erro na autenticação com Spotify");
    }
  });

  /**
   * Salva o refresh token do usuário logado
   */
  router.post("/save-token", auth.authMiddleware, async (req, res) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) return res.status(400).json({ error: "Refresh token ausente" });
      
      await db.setSpotifyRefreshToken(req.user.id, refresh_token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Retorna um access token válido.
   * Prioridade:
   * 1. Token do usuário logado (se houver refresh_token salvo)
   * 2. Token da "Rádio Brazug" (usando CLIENT_SECRET do .env se for um refresh token)
   */
  router.get("/token", async (req, res) => {
    let refreshToken = null;

    // Tenta pegar do usuário logado (opcionalmente via Header)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const user = auth.verifyToken(authHeader.slice(7));
      if (user) {
        refreshToken = await db.getSpotifyRefreshToken(user.id);
      }
    }

    // Fallback para a Rádio Brazug (Default)
    if (!refreshToken) {
      const envSecret = process.env.SPOTIFY_REFRESH_TOKEN || process.env.CLIENT_SECRET;
      if (envSecret && envSecret.startsWith("BQB")) {
        refreshToken = envSecret;
      }
    }

    if (!refreshToken) {
      return res.status(404).json({ error: "Nenhuma conta Spotify conectada à rádio" });
    }

    try {
      const data = await spotify.refreshToken(refreshToken);
      res.json({
        access_token: data.access_token,
        expires_in: data.expires_in
      });
    } catch (err) {
      console.error("[Spotify Token Refresh Error]", err.message);
      res.status(500).json({ error: "Falha ao obter token da rádio" });
    }
  });

  return router;
}

module.exports = { createSpotifyRouter };
