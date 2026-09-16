"use strict";

const express = require("express");

// Constantes de escopo fixo da guilda
const GUILD = 'BRAZUG';
const REALM = 'Doomhowl';
const EXPANSION = 'vanilla';
const DEATHMAP_BASE = "https://wowdeathmap.com/api";

function getDeathmapHeaders() {
  return {
    "x-api-key": process.env.DEATHMAP_API_KEY || process.env["x-api-key"] || "",
    "User-Agent": "BRAZUG-Guild-Dashboard/1.0",
    "Accept": "application/json"
  };
}

async function deathmapFetch(path, params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const qs = new URLSearchParams(cleanParams).toString();
  const url = `${DEATHMAP_BASE}${path}${qs ? "?" + qs : ""}`;

  const response = await fetch(url, {
    headers: getDeathmapHeaders(),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const err = new Error(`DeathMap API error: ${response.status}`);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return response.json();
}

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function deathmapFetchCached(path, params = {}, forceRefresh = false) {
  const cacheKey = path + JSON.stringify(params);
  
  if (!forceRefresh && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
  }

  const data = await deathmapFetch(path, params);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

function createDeathmapRouter() {
  const router = express.Router();

  // 1. Resumo Oficial de Perdas da BRAZUG
  router.get('/summary', async (req, res, next) => {
    try {
      const forceRefresh = req.query.forceRefresh === 'true';
      const data = await deathmapFetchCached(`/v1/guilds/${EXPANSION}/${REALM}/${GUILD}`, {}, forceRefresh);
      res.json(data);
    } catch (err) { next(err); }
  });

  // 2. Feed de Mortes Filtrado Apenas para a BRAZUG
  router.get('/deaths', async (req, res, next) => {
    try {
      const forceRefresh = req.query.forceRefresh === 'true';
      const { limit = 25, cursor, minLevel, maxLevel, classId } = req.query;
      const data = await deathmapFetchCached('/v1/deaths', {
        expansion: EXPANSION,
        realm: REALM,
        guild: GUILD,
        limit,
        cursor,
        minLevel,
        maxLevel,
        classId
      }, forceRefresh);
      res.json(data);
    } catch (err) { next(err); }
  });

  // 3. Indicadores de Atividade / Streaks da BRAZUG
  router.get('/streaks', async (req, res, next) => {
    try {
      const forceRefresh = req.query.forceRefresh === 'true';
      const qs = new URLSearchParams({ expansion: EXPANSION, realm: REALM, guild: GUILD }).toString();
      const cacheKey = '/v1/streaks?' + qs;

      if (!forceRefresh && cache.has(cacheKey)) {
        const entry = cache.get(cacheKey);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          return res.json(entry.data);
        }
      }

      const response = await fetch(`${DEATHMAP_BASE}/v1/streaks?${qs}`, {
        headers: { "User-Agent": getDeathmapHeaders()["User-Agent"] },
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`DeathMap streaks error: ${response.status}`);
      }
      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (err) { next(err); }
  });

  // 4. Digest / Recapitulação Periódica da BRAZUG
  router.get('/digest', async (req, res, next) => {
    try {
      const forceRefresh = req.query.forceRefresh === 'true';
      const { window = '7d' } = req.query;
      const data = await deathmapFetchCached('/v1/digest', { 
        expansion: EXPANSION, 
        realm: REALM, 
        guild: GUILD, 
        window 
      }, forceRefresh);
      res.json(data);
    } catch (err) { next(err); }
  });

  // 5. Cartão Memorial da BRAZUG em Imagem PNG
  router.get('/card-url', (req, res) => {
    const theme = req.query.theme || 'blood';
    const cardUrl = `https://wowdeathmap.com/api/v1/cards/guild/${EXPANSION}/${REALM}/${GUILD}.png?theme=${theme}`;
    res.json({ cardUrl });
  });

  router.use((err, req, res, _next) => {
    console.error("[DeathMap API Error]", err.status || 500, err.message, err.body || "");
    res.status(err.status || 500).json({
      error: true,
      message: err.message,
      details: err.body || null
    });
  });

  return router;
}

module.exports = { createDeathmapRouter };
