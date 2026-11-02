"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createCoreRouter() {
  const router = express.Router();

  // ── ROTAS PROTEGIDAS (usuário logado) ──
  router.use(auth.authMiddleware);

  // Minhas inscrições
  router.get("/my", async function (req, res) {
    try {
      const items = await db.listCoreApplications({ user_id: req.user.id });
      res.json({ applications: items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Criar inscrição (exige login)
  router.post("/apply", async function (req, res) {
    try {
      const { core_id, core_name, answers } = req.body || {};
      if (!core_id || !core_name) {
        return res.status(400).json({ error: "CORE não informado" });
      }
      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ error: "Respostas não informadas" });
      }

      const application = await db.createCoreApplication(req.user.id, {
        core_id,
        core_name,
        answers
      });

      res.status(201).json({ application });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ── ROTAS DE ADMIN ──
  router.get("/applications", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      const filters = {};
      if (req.query.core_id) filters.core_id = req.query.core_id;
      if (req.query.status) filters.status = req.query.status;
      const items = await db.listCoreApplications(filters);
      res.json({ applications: items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/applications/:id", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      const item = await db.getCoreApplication(req.params.id);
      if (!item) return res.status(404).json({ error: "Inscrição não encontrada" });
      res.json({ application: item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch("/applications/:id/status", auth.requireRole(["admin", "guildmaster", "officer"]), async function (req, res) {
    try {
      const { status } = req.body || {};
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }
      const item = await db.updateCoreApplicationStatus(req.params.id, status);
      if (!item) return res.status(404).json({ error: "Inscrição não encontrada" });
      res.json({ application: item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete("/applications/:id", auth.requireRole(["admin", "guildmaster"]), async function (req, res) {
    try {
      const ok = await db.deleteCoreApplication(req.params.id);
      if (!ok) return res.status(404).json({ error: "Inscrição não encontrada" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createCoreRouter };
