"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createCharacterRouter() {
  const router = express.Router();
  const ARMORY_URL = process.env.ARMORY_URL || "http://127.0.0.1:3000";

  // LIST CHARACTERS
  router.get("/characters", async function (req, res) {
    try {
      // Optional authentication for private characters
      const authHeader = req.headers.authorization;
      let user = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          user = auth.verifyToken(token);
        } catch (e) {
          // Ignore invalid token for list (will only show public)
        }
      }
      const list = await db.listCharacters(user);
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET SPECIFIC CHARACTER
  router.get("/characters/:id", async function (req, res) {
    try {
      // 1. Tentar pegar o usuário do token, se existir
      const authHeader = req.headers.authorization;
      let user = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          user = auth.verifyToken(token);
        } catch (e) {
          // Token inválido, segue como usuário não autenticado
        }
      }

      // 2. Busca o personagem (usando a lógica da listCharacters que já filtra por visibilidade)
      const list = await db.listCharacters(user); 
      const char = list.find(c => c.id === req.params.id);
      
      if (!char) {
        return res.status(404).json({ error: "Personagem não encontrado ou acesso negado." });
      }
      
      res.json(char);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // SEARCH CHARACTER (Legacy compatibility)
  router.get("/characters/search", async (req, res) => {
    try {
      const char = await db.getCharacterByName(req.query.name);
      if (!char) return res.status(404).json({ error: "Não encontrado" });
      res.json(char);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // BLIZZARD PROXY
  router.get("/character/fetch/:realm/:name", async (req, res) => {
    const { realm, name } = req.params;
    try {
      console.log(`[API] Proxying fetch for ${name}-${realm} to ${ARMORY_URL}`);
      const response = await fetch(`${ARMORY_URL}/api/character/fetch/${realm}/${name}`);

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: "Resposta inesperada do Armory", details: text.substring(0, 200) };
      }

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (err) {
      console.error(`[API] Fetch proxy failed for ${name}:`, err.message);
      res.status(500).json({
        error: `Erro ao conectar com serviço de Armory (${ARMORY_URL}): ${err.message}`,
        details: err.message
      });
    }
  });

  // LIST ADVENTURES (Public)
  router.get("/adventures", async function (req, res) {
    try {
      // Frontend pode chamar /api/adventures?shadow=...
      const shadowKey = String(req.query.shadow || "");

      // comportamento do frontend (AdventureModel):
      // - shadowKey vazio => aventuras publicadas
      // - shadowKey igual a "que as sombras mostram meu destino" => sombras
      const isShadow = shadowKey === "que as sombras mostram meu destino";

      // db.listAdventures(publishedOnly=true) retorna as aprovadas/públicas
      // para sombras, queremos ignorar filtro de publishedOnly
      const items = await db.listAdventures(!isShadow);
      res.json({ adventures: items });
    } catch (e) {
      console.error("[API] GET /adventures error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // PROTECTED ROUTES
  router.use(auth.authMiddleware);

  // CREATE CHARACTER
  router.post("/characters", async function (req, res) {
    console.log("[DEBUG] Criando char para user.id:", req.user?.id, "Usuário:", req.user?.username);
    try {
      const char = await db.createCharacter(req.body, req.user.id);
      res.status(201).json(char);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // UPDATE CHARACTER
  router.put("/characters/:id", async function (req, res) {
    try {
      // First verify ownership or admin
      const charId = req.params.id;
      const updated = await db.updateCharacter(charId, req.body, req.user);
      if (!updated) return res.status(404).json({ error: "Não encontrado ou sem permissão" });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // DELETE CHARACTER
  router.delete("/characters/:id", async function (req, res) {
    try {
      const ok = await db.deleteCharacter(req.params.id, req.user);
      res.json({ ok });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createCharacterRouter };
