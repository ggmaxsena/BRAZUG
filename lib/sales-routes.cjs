"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createSalesRouter() {
  const router = express.Router();

  // --- ROTAS PÚBLICAS ---

  // SEARCH ITEMS
  router.get("/items/search", async function (req, res) {
    try {
      const { name } = req.query;
      const client = await db.getPool();
      const items = await client.query(
        "SELECT id, name, quality FROM item WHERE LOWER(name) LIKE LOWER($1) LIMIT 10",
        [`%${name}%`]
      );
      res.json(items.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // SEARCH ITEMS (Grouped)
  router.get("/search-items", async function (req, res) {
    try {
      const items = await db.searchGroupedItems(req.query);
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // LIST SALES (Global with filters)
  router.get("/", async function (req, res) {
    try {
      const sales = await db.listSales(req.query);
      res.json(sales);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // LIST SALES FOR A CHARACTER
  router.get("/character/:characterId", async function (req, res) {
    try {
      const sales = await db.listSalesByCharacter(req.params.characterId);
      res.json(sales);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ROTAS PROTEGIDAS ---
  router.use(auth.authMiddleware);

  // CREATE SALE
  router.post("/", async function (req, res) {
    try {
      // Basic validation
      const { character_id, item_name, item_id, price, description } = req.body;
      if (!character_id || !item_name || !price) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      const sale = await db.createSale({ character_id, item_name, item_id, price, description });
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

  // PLACE BID
  router.post("/:saleId/bids", async function (req, res) {
    try {
      const { saleId } = req.params;
      const { bidder_character_id, amount } = req.body;
      if (!bidder_character_id || !amount) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      
      // Validação: Novo lance deve ser maior que o anterior (ou maior que o preço inicial se não houver lances)
      const bids = await db.listBids(saleId);
      const maxBid = bids.length > 0 ? parseInt(bids[0].amount) : 0;
      
      if (parseInt(amount) <= maxBid) {
        return res.status(400).json({ error: "O lance deve ser maior que o lance anterior." });
      }

      const bid = await db.createBid({ sale_id: saleId, bidder_character_id, amount });
      res.status(201).json(bid);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createSalesRouter };
