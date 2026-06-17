"use strict";

const express = require("express");
const db = require("./db.cjs");
const auth = require("./auth.cjs");

const Items = require("wow-classic-items");
const itemsLib = new Items.Items();

function createCharacterRouter() {
  const router = express.Router();
  const ARMORY_URL = process.env.ARMORY_URL || "http://2.24.124.162:3001";

  // Helper para enriquecer item via wow-classic-items
  async function enrichItem(itemId) {
    const libItem = itemsLib.find(i => i.itemId === itemId);
    if (!libItem) return null;

    let iconName = libItem.icon;
    if (iconName && iconName.includes('/')) {
        const parts = iconName.split('/');
        iconName = parts[parts.length - 1].replace('.jpg', '');
    }

    const tooltipData = {
        level: libItem.itemLevel,
        required_level: libItem.requiredLevel,
        inventory_type: { name: libItem.slot },
        item_subclass: { name: libItem.subclass },
        quality: { type: libItem.quality.toUpperCase() },
        stats: libItem.tooltip.filter(line => line.label.startsWith('+')).map(line => ({
            display: { display_string: line.label }
        })),
        spells: libItem.tooltip.filter(line => line.label.startsWith('Equip:') || line.label.startsWith('Use:')).map(line => ({
            description: line.label
        })),
        description: libItem.tooltip.find(line => line.format === 'FlavorText')?.label,
        wow_classic_items_raw: libItem
    };

    // Update DB
    await db.getPool().then(pool => pool.query(
      'UPDATE armory."Item" SET name = $1, quality = $2, icon = $3, tooltip_data = $4 WHERE id = $5',
      [libItem.name, libItem.quality.toUpperCase(), iconName, JSON.stringify(tooltipData), itemId]
    )).catch(e => console.error("[DB] Error updating enriched item:", e.message));

    return {
        id: itemId,
        name: libItem.name,
        quality: libItem.quality.toUpperCase(),
        icon: iconName,
        tooltip_data: tooltipData
    };
  }

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
      const charId = req.params.id;
      const char = await db.getCharacterById(charId);
      
      if (!char) {
        return res.status(404).json({ error: "Personagem não encontrado." });
      }

      // 1. Tentar pegar o usuário do token para verificar visibilidade privada
      const authHeader = req.headers.authorization;
      let user = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          user = auth.verifyToken(token);
        } catch (e) {}
      }

      const isOwner = user && String(char.user_id) === String(user.id);
      const isAdmin = user && user.role === 'admin';

      if (char.visibility === 'private' && !isOwner && !isAdmin) {
        return res.status(403).json({ error: "Acesso negado a este perfil privado." });
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
      const targetUrl = `${ARMORY_URL}/api/character/fetch/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`;
      console.log(`[Proxy] Target: ${targetUrl}`);
      
      const response = await fetch(targetUrl);
      const data = await response.json().catch(() => ({ error: "Invalid JSON from Armory" }));

      if (!response.ok) {
        console.warn(`[Proxy] Armory returned error ${response.status}:`, data);
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (err) {
      console.error(`[Proxy] Critical failure for ${name}:`, err.message);
      res.status(500).json({
        error: `Erro de conexão com o Armory`,
        details: err.message
      });
    }
  });

  // ARMORY ITEM SEARCH
  router.get("/armory/items", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q) return res.json([]);
      const results = await db.searchArmoryItems(q, parseInt(limit) || 20);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ARMORY ITEM GET
  router.get("/armory/items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      let item = await db.getArmoryItem(itemId);
      
      // Se o item não tem tooltip_data ou é "Unknown", tenta enriquecer
      if (!item || !item.tooltip_data || item.name === 'Unknown') {
        console.log(`[Proxy] Enriching item data for ${itemId} via local library...`);
        const enriched = await enrichItem(itemId);
        if (enriched) {
            item = enriched;
        } else {
            // Se falhar na lib local, tenta no módulo Armory como última opção
            console.log(`[Proxy] Fetching missing item data for ${itemId} from Armory module...`);
            try {
              const armoryRes = await fetch(`${ARMORY_URL}/api/item/${itemId}`);
              if (armoryRes.ok) {
                item = await db.getArmoryItem(itemId);
              }
            } catch (e) {
              console.error(`[Proxy Error] Failed to fetch item from Armory: ${e.message}`);
            }
        }
      }

      if (!item) return res.status(404).json({ error: "Item não encontrado" });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
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

  // MANUAL SYNC PROXY (Admin only)
  router.post("/character/sync", async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Somente administradores podem forçar sincronização." });
    }

    const { name, realm, region } = req.body;
    const realLocal = "http://localhost:3001";
    const remoteUrl = "http://2.24.124.162:3001";

    async function trySync(url) {
      console.log(`[SYNC-PROXY] Trying sync for ${name}-${realm} at ${url}`);
      const response = await fetch(`${url}/api/character/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, realm, region: region || 'us' })
      });
      
      if (!response.ok) {
        let errorMsg = `HTTP Error: ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg += ` - ${errData.error || errData.message || JSON.stringify(errData)}`;
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(errorMsg);
      }
      return await response.json();
    }

    const urlsToTry = [...new Set([realLocal, ARMORY_URL, remoteUrl])];
    let lastError = null;

    for (const url of urlsToTry) {
      try {
        const data = await trySync(url);
        return res.json(data);
      } catch (err) {
        lastError = err;
        console.warn(`[SYNC-PROXY-WARN] Sync failed at ${url}: ${err.message}`);
      }
    }

    console.error(`[SYNC-PROXY-ERROR] All sync attempts failed for ${name}-${realm}`);
    res.status(500).json({ 
      error: "Todas as tentativas de sincronização falharam.", 
      details: lastError?.message || "Erro desconhecido"
    });
  });

  return router;
}

module.exports = { createCharacterRouter };
