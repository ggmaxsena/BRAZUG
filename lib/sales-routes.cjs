"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

function createSalesRouter() {
  const router = express.Router();

  // --- ROTAS PÚBLICAS ---

  // SEARCH ITEMS (Autocomplete)
  router.get("/items/search", async function (req, res) {
    try {
      const { name, quality, category, page = 1 } = req.query;
      const client = await db.getPool();
      const limit = 10;
      const offset = (page - 1) * limit;

      let queryBase = "FROM item WHERE 1=1";
      const params = [];
      let i = 1;

      if (name) {
        queryBase += ` AND LOWER(name) LIKE LOWER($${i++})`;
        params.push(`%${name}%`);
      }
      if (quality) {
        queryBase += ` AND LOWER(quality) = LOWER($${i++})`;
        params.push(quality);
      }
      if (category) {
        queryBase += ` AND LOWER(slot) = LOWER($${i++})`;
        params.push(category);
      }

      // Get total count
      const countRes = await client.query(`SELECT COUNT(*) ${queryBase}`, params);
      const totalItems = parseInt(countRes.rows[0].count);
      const totalPages = Math.ceil(totalItems / limit);

      // Get items
      const queryItems = `SELECT id, name, quality, slot, icon_filename ${queryBase} ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`;
      const itemsRes = await client.query(queryItems, params);

      res.json({
        items: itemsRes.rows,
        totalPages: totalPages,
        currentPage: parseInt(page)
      });
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

  // GET BIDS FOR A SALE (Public)
  router.get("/:saleId/bids", async function (req, res) {
    try {
      const { saleId } = req.params;
      const bids = await db.listBids(saleId);
      res.json(bids);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ROTAS PROTEGIDAS ---
  router.use(auth.authMiddleware);

  // GET NOTIFICATIONS (Lances recebidos nos meus itens)
  router.get("/notifications", async function (req, res) {
    try {
      const client = await db.getPool();
      const resData = await client.query(`
        SELECT b.*, s.item_name, c.name as bidder_name 
        FROM bids b
        JOIN sales s ON b.sale_id = s.id
        JOIN wow_characters c ON b.bidder_character_id = c.id
        WHERE s.character_id IN (SELECT id FROM wow_characters WHERE user_id = $1)
        ORDER BY b.created_at DESC
        LIMIT 20
      `, [req.user.id]);
      res.json(resData.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // CREATE SALE
  router.post("/", async function (req, res) {
    try {
      // Basic validation
      const { character_id, item_name, item_id, price, quantity, description, duration_hours } = req.body;
      if (!character_id || !item_name || !price || !duration_hours) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      const sale = await db.createSale({ character_id, item_name, item_id, price, quantity: quantity || 1, description, duration_hours }, req.user);
      res.status(201).json(sale);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // DELETE SALE
  router.delete("/:id", async function (req, res) {
    try {
      const ok = await db.deleteSale(req.params.id, req.user);
      if (!ok) return res.status(404).json({ error: "Venda não encontrada ou sem permissão" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PURCHASE SALE
  router.post("/:id/purchase", async function (req, res) {
    try {
      const { buyer_character_id } = req.body;
      const sale = await db.purchaseSale(req.params.id, buyer_character_id, req.user);
      if (!sale) return res.status(404).json({ error: "Venda não disponível ou não encontrada" });
      res.json(sale);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createSalesRouter };
