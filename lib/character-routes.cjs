"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

const Items = require("wow-classic-items");
const itemsLib = new Items.Items();

function createCharacterRouter() {
  const router = express.Router();

  // LIST CHARACTERS
  router.get("/characters", async function (req, res) {
    try {
      // Optional authentication for private characters
      const authHeader = req.headers.authorization;
      let user = null;
      try {
        user = await auth.resolveRequestUser(req);
      } catch (e) {
        user = null;
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
      const charId = req.params.id;
      const char = await db.getCharacterById(charId);

      if (!char) {
        return res.status(404).json({ error: "Personagem não encontrado." });
      }

      // 1. Tentar pegar o usuário do token para verificar visibilidade privada
      const authHeader = req.headers.authorization;
      let user = null;
      try {
        user = await auth.resolveRequestUser(req);
      } catch (e) {
        user = null;
      }

      const isOwner = user && String(char.user_id) === String(user.id);
      const isAdmin = user && user.role === 'admin';

      if (char.visibility !== 'public' && !isOwner && !isAdmin) {
        return res.status(403).json({ error: "Acesso negado a este perfil privado." });
      }

      res.json(char);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GUILD STATS
  router.get("/guild/stats", async function (req, res) {
    try {
      const stats = await db.getGuildStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // LIST ADVENTURES (Public)
  router.get("/adventures", async function (req, res) {
    try {
      const items = await db.listAdventures(true);
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
      if (req.body && req.body.sheet) {
        char.sheet = await db.saveCharacterSheet(char.id, req.body.sheet);
      }
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
      if (req.body && req.body.sheet) {
        updated.sheet = await db.saveCharacterSheet(charId, req.body.sheet);
      }
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
