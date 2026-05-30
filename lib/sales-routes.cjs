"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createSalesRouter() {
  const router = express.Router();

  // LIST SALES FOR A CHARACTER (Public or Private depending on char visibility)
  router.get("/:characterId", async function (req, res) {
    try {
      const sales = await db.listSalesByCharacter(req.params.characterId);
      res.json(sales);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PROTECTED ROUTES
  router.use(auth.authMiddleware);

  // CREATE SALE
  router.post("/", async function (req, res) {
    try {
      // Basic validation
      const { character_id, item_name, price, description } = req.body;
      if (!character_id || !item_name || !price) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      const sale = await db.createSale({ character_id, item_name, price, description });
      res.status(201).json(sale);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // DELETE SALE
  router.delete("/:id", async function (req, res) {
    try {
      const ok = await db.deleteSale(req.params.id);
      if (!ok) return res.status(404).json({ error: "Venda não encontrada" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createSalesRouter };
