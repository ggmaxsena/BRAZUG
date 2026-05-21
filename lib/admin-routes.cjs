"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createAdminRouter() {
  const router = express.Router();
  const uploadDir = path.join(__dirname, "..", "data", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, safe);
    },
  });
  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  router.post("/login", function (req, res) {
    const password = req.body && req.body.password;
    if (!auth.checkPassword(password)) {
      res.status(401).json({ error: "Senha incorreta" });
      return;
    }
    try {
      res.json({ token: auth.createToken() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.use(auth.authMiddleware);

  router.get("/adventures", async function (req, res) {
    try {
      const items = await db.listAdventures(false);
      res.json({ adventures: items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/adventures", async function (req, res) {
    try {
      const item = await db.createAdventure(req.body || {});
      res.status(201).json({ adventure: item });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put("/adventures/:id", async function (req, res) {
    try {
      const id = req.params.id;
      const item = await db.updateAdventure(id, req.body || {});
      if (!item) {
        res.status(404).json({ error: "Não encontrado" });
        return;
      }
      res.json({ adventure: item });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete("/adventures/:id", async function (req, res) {
    try {
      await db.deleteAdventure(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/upload", upload.single("image"), function (req, res) {
    if (!req.file) {
      res.status(400).json({ error: "Arquivo ausente" });
      return;
    }
    res.json({ url: "/uploads/" + req.file.filename });
  });

  return router;
}

module.exports = { createAdminRouter };
