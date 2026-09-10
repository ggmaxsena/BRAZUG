"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createSucessoRouter() {
  const router = express.Router();

  // --- ROTAS PÚBLICAS ---
  router.get("/", async function (req, res) {
    try {
      const successes = await db.listSuccesses();
      res.json(successes);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ROTAS PROTEGIDAS ---
  router.use(auth.authMiddleware);
  
  // Apenas admins e officers (e guildmaster, já que no DB isso é similar a officer/admin)
  router.use(auth.requireRole(["admin", "officer", "guildmaster"]));

  // CREATE SUCESSO
  router.post("/", async function (req, res) {
    try {
      const { title, description, image_url, video_url } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Título é obrigatório" });
      }

      const success = await db.createSuccess({ title, description, image_url, video_url }, req.user);
      res.status(201).json(success);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // DELETE SUCESSO
  router.delete("/:id", async function (req, res) {
    try {
      const ok = await db.deleteSuccess(req.params.id);
      if (!ok) return res.status(404).json({ error: "Sucesso não encontrado" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createSucessoRouter };
