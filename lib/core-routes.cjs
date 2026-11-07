"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createCoreRouter() {
  const router = express.Router();

  // COREs que não estão aceitando inscrições no momento.
  const CLOSED_CORE_IDS = new Set(["velho", "pvp", "liga-sombras", "tahaskk"]);
  const STAFF_ROLES = ["admin", "guildmaster", "officer"];

  function isStaff(user) {
    return !!user && STAFF_ROLES.includes(user.role);
  }

  async function canManageCore(user, coreId) {
    if (isStaff(user)) return true;
    return db.isCoreLeader(user.id, coreId);
  }

  // Páginas personalizadas dos COREs (público)
  router.get("/pages", async function (req, res) {
    try {
      const pages = await db.getCorePages();
      res.json({ pages });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/pages/:coreId", async function (req, res) {
    try {
      const page = await db.getCorePage(req.params.coreId);
      if (!page) return res.status(404).json({ error: "Página não encontrada" });
      res.json({ page });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

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

  // COREs em que o usuário é raid leader
  router.get("/my-leadership", async function (req, res) {
    try {
      const coreIds = await db.getCorePagesForLeader(req.user.id);
      res.json({ coreIds, isStaff: isStaff(req.user) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Usuários disponíveis para serem raid leaders (staff)
  router.get("/leader-options", auth.requireRole(STAFF_ROLES), async function (req, res) {
    try {
      const users = await db.listUsers();
      res.json({
        users: users.map(user => ({ id: user.id, username: user.username, role: user.role }))
      });
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
      const page = await db.getCorePage(String(core_id)).catch(() => null);
      if (page) {
        if (page.registrationOpen === false || page.status !== "active") {
          return res.status(403).json({ error: "Este CORE não está aceitando novas inscrições." });
        }
      } else if (CLOSED_CORE_IDS.has(String(core_id))) {
        return res.status(403).json({ error: "Este CORE não está aceitando novas inscrições." });
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

  // ── ROTAS DE GESTÃO (staff ou raid leader do CORE) ──
  router.get("/applications", async function (req, res) {
    try {
      const staff = isStaff(req.user);
      const leaderCores = staff ? [] : await db.getCorePagesForLeader(req.user.id);
      if (!staff && !leaderCores.length) {
        return res.status(403).json({ error: "Você não gerencia nenhum CORE." });
      }

      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.core_id) {
        if (!staff && !leaderCores.includes(req.query.core_id)) {
          return res.status(403).json({ error: "Você não gerencia este CORE." });
        }
        filters.core_id = req.query.core_id;
      } else if (!staff) {
        filters.core_ids = leaderCores;
      }

      const items = await db.listCoreApplications(filters);
      res.json({ applications: items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/applications/:id", async function (req, res) {
    try {
      const item = await db.getCoreApplication(req.params.id);
      if (!item) return res.status(404).json({ error: "Inscrição não encontrada" });
      if (!isStaff(req.user) && !(await db.isCoreLeader(req.user.id, item.core_id))) {
        return res.status(403).json({ error: "Você não gerencia este CORE." });
      }
      res.json({ application: item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch("/applications/:id/status", async function (req, res) {
    try {
      const current = await db.getCoreApplication(req.params.id);
      if (!current) return res.status(404).json({ error: "Inscrição não encontrada" });
      if (!isStaff(req.user) && !(await db.isCoreLeader(req.user.id, current.core_id))) {
        return res.status(403).json({ error: "Você não gerencia este CORE." });
      }

      const { status, note } = req.body || {};
      if (!["pending", "approved", "rejected", "needs_info"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }
      if (status === "needs_info" && !String(note || "").trim()) {
        return res.status(400).json({ error: "Descreva o que falta na inscrição." });
      }
      const item = await db.updateCoreApplicationStatus(req.params.id, status, note, req.user.id);
      if (!item) return res.status(404).json({ error: "Inscrição não encontrada" });
      res.json({ application: item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Personalização da página do CORE (staff ou raid leader)
  router.put("/pages/:coreId", async function (req, res) {
    try {
      const staff = isStaff(req.user);
      if (!staff && !(await db.isCoreLeader(req.user.id, req.params.coreId))) {
        return res.status(403).json({ error: "Você não gerencia este CORE." });
      }

      const allowedStatuses = ["active", "soon", "closed"];
      const data = { ...(req.body || {}) };
      if (data.status && !allowedStatuses.includes(data.status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      // Apenas staff pode transferir a liderança do CORE.
      if (!staff) {
        const existing = await db.getCorePage(req.params.coreId);
        data.leaderUserId = existing ? existing.leaderUserId : null;
      }

      if (data.leaderUserId && !data.leaderName) {
        const leader = await db.getUserById(data.leaderUserId);
        if (leader) data.leaderName = leader.username;
      }

      const page = await db.upsertCorePage(req.params.coreId, data);
      res.json({ page });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete("/applications/:id", async function (req, res) {
    try {
      const item = await db.getCoreApplication(req.params.id);
      if (!item) return res.status(404).json({ error: "Inscrição não encontrada" });

      const canDelete = ["admin", "guildmaster"].includes(req.user.role) ||
        await db.isCoreLeader(req.user.id, item.core_id);
      if (!canDelete) return res.status(403).json({ error: "Você não gerencia este CORE." });

      const ok = await db.deleteCoreApplication(req.params.id);
      res.json({ ok });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createCoreRouter };
