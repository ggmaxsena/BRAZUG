"use strict";

const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const db = require("./db.cjs");
const auth = require("./auth.cjs");
const email = require("./email.cjs");
const { adminAuthMiddleware, requirePermission, auditLog } = require("./admin-api-auth.cjs");

// Rate limiting: 10 req/min por IP (1000 em modo de teste)
const isTestMode = process.env.ADMIN_API_KEY === "teste123";
const adminRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isTestMode ? 1000 : 10,
  message: { error: "Muitas requisições. Tente novamente em 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

function createAdminApiRouter() {
  const router = express.Router();

  // Aplica rate limiting e autenticação em todas as rotas
  router.use(adminRateLimiter);
  router.use(adminAuthMiddleware);

  /* =========================================
     REGISTRO (cadastro via bot Discord)
     ========================================= */

  // Cria conta para um membro do Discord (usado pelo /cadastro do bot)
  router.post("/register", async (req, res) => {
    try {
      const { username, email: userEmail, discord_id, discord_tag } = req.body || {};

      const validUsername = auth.validateUsername(username);
      const validEmail = auth.validateEmail(userEmail);
      if (!validUsername || !validEmail) {
        return res.status(400).json({
          error: "Nome de usuário inválido (3-32: letras minúsculas, números ou _) ou e-mail inválido."
        });
      }

      // Existência (mensagem única para não revelar qual dos dois existe)
      const existingUser = await db.getUserByUsername(validUsername);
      const existingEmail = await db.getUserByEmail(validEmail);
      if (existingUser || existingEmail) {
        return res.status(409).json({ error: "Este nome de usuário ou e-mail já está em uso." });
      }

      // Discord já vinculado a outra conta?
      if (discord_id) {
        const linked = await db.getAccount("discord", String(discord_id));
        if (linked) {
          return res.status(409).json({
            error: `Este Discord já está vinculado à conta "${linked.username}".`
          });
        }
      }

      // Senha temporária aleatória que NINGUÉM conhece: só vale de verdade
      // quando o usuário define a dele no link do e-mail (reset-password + ativação)
      const tempPassword = crypto.randomBytes(24).toString("base64url");
      const newUser = await db.createUser({
        username: validUsername,
        email: validEmail,
        password: auth.hashPassword(tempPassword),
        role: "guildmember",
      });

      // Vincula o Discord (habilita "Entrar com Discord" no futuro)
      if (discord_id) {
        await db.linkAccount({
          userId: newUser.id,
          provider: "discord",
          providerAccountId: String(discord_id),
          email: validEmail
        });
      }

      // Token "defina sua senha" (48h)
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Mantém o token legado (users.reset_token) e registra o hash em
      // verification_tokens — o /reset-password consome o hash primeiro.
      await db.setResetToken(validEmail, token, expires);
      await db.createAuthToken({
        userId: newUser.id,
        tokenHash: auth.hashToken(token),
        type: "reset",
        expiresAt: expires
      });

      const setupUrl = `${(process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/reset-password.html?token=${token}`;

      let emailSent = true;
      try {
        await email.sendBotRegistrationEmail(validEmail, validUsername, token);
      } catch (e) {
        emailSent = false;
        console.error("[AdminAPI] Falha ao enviar e-mail de cadastro:", e.message);
      }

      await auditLog(req, "user.register", { type: "user", id: newUser.id }, {
        username: validUsername,
        email: validEmail,
        discord_tag: discord_tag || null,
        email_sent: emailSent,
      });

      res.status(201).json({
        ok: true,
        email_sent: emailSent,
        // Link devolvido ao bot para entregar no Discord (mensagem efêmera/DM).
        // Só trafega nesta API autenticada por X-API-Key.
        setup_url: setupUrl,
        expires_at: expires.toISOString(),
        user: { id: newUser.id, username: validUsername },
      });
    } catch (err) {
      console.error("[AdminAPI] Register error:", err);
      res.status(500).json({ error: "Erro ao criar conta" });
    }
  });

  /* =========================================
     USERS
     ========================================= */

  // Listar usuários
  router.get("/users", requirePermission("users.read"), async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;
      const search = req.query.search || "";

      let query = "SELECT id, username, email, role, is_verified, created_at FROM users";
      const params = [];

      if (search) {
        query += " WHERE LOWER(username) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)";
        params.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.getPool().then(pool => pool.query(query, params));

      // Total count
      let countQuery = "SELECT COUNT(*) FROM users";
      const countParams = [];
      if (search) {
        countQuery += " WHERE LOWER(username) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)";
        countParams.push(`%${search}%`);
      }
      const countResult = await db.getPool().then(pool => pool.query(countQuery, countParams));

      res.json({
        users: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      });
    } catch (err) {
      console.error("[AdminAPI] List users error:", err);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  });

  // Criar usuário
  router.post("/users", requirePermission("user.create"), async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username e senha são obrigatórios" });
      }

      const validationError = auth.validatePassword(password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const hashedPassword = auth.hashPassword(password);
      const user = await db.createUser({
        username,
        email: email || null,
        password: hashedPassword,
        role: role || "guildmember"
      });

      await auditLog(req, "user.create", { type: "user", id: user.id }, { username, email, role });

      res.status(201).json({ user });
    } catch (err) {
      console.error("[AdminAPI] Create user error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Banir usuário
  router.post("/users/:id/ban", requirePermission("user.ban"), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await db.getPool().then(pool =>
        pool.query("UPDATE users SET role = 'banned' WHERE id = $1::uuid RETURNING *", [id])
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      await auditLog(req, "user.ban", { type: "user", id }, { reason });

      res.json({ user: result.rows[0], message: "Usuário banido com sucesso" });
    } catch (err) {
      console.error("[AdminAPI] Ban user error:", err);
      res.status(500).json({ error: "Erro ao banir usuário" });
    }
  });

  // Desbanir usuário
  router.delete("/users/:id/ban", requirePermission("user.unban"), async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.getPool().then(pool =>
        pool.query("UPDATE users SET role = 'guildmember' WHERE id = $1::uuid RETURNING *", [id])
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      await auditLog(req, "user.unban", { type: "user", id }, {});

      res.json({ user: result.rows[0], message: "Usuário desbanido com sucesso" });
    } catch (err) {
      console.error("[AdminAPI] Unban user error:", err);
      res.status(500).json({ error: "Erro ao desbanir usuário" });
    }
  });

  /* =========================================
     EVENTOS (AGENDA)
     ========================================= */

  // Listar eventos
  router.get("/events", requirePermission("event.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;
      if (!guildId) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      const events = await db.listEvents(guildId);
      res.json({ events });
    } catch (err) {
      console.error("[AdminAPI] List events error:", err);
      res.status(500).json({ error: "Erro ao listar eventos" });
    }
  });

  // Criar evento
  router.post("/events", requirePermission("event.create"), async (req, res) => {
    try {
      const { guild_id, title, description, event_date, event_type } = req.body;

      if (!guild_id || !title || !event_date) {
        return res.status(400).json({ error: "guild_id, title e event_date são obrigatórios" });
      }

      // Guild precisa existir no banco (registrada via /setup)
      const guild = await db.getGuildByDiscordId(guild_id);
      if (!guild) {
        return res.status(400).json({
          error: "Guild não registrada. Use o comando /setup no Discord primeiro."
        });
      }

      const event = await db.createEvent({
        guild_id,
        title,
        description,
        event_date,
        event_type,
        created_by: req.user?.username || "api-key"
      });

      await auditLog(req, "event.create", { type: "event", id: event.id }, { title, event_date });

      res.status(201).json({ event });
    } catch (err) {
      console.error("[AdminAPI] Create event error:", err);
      res.status(500).json({ error: "Erro ao criar evento" });
    }
  });

  // Atualizar evento
  router.put("/events/:id", requirePermission("event.update"), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, event_date, event_type } = req.body;

      const event = await db.updateEvent(id, { title, description, event_date, event_type });

      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      await auditLog(req, "event.update", { type: "event", id }, { title, event_date });

      res.json({ event });
    } catch (err) {
      console.error("[AdminAPI] Update event error:", err);
      res.status(500).json({ error: "Erro ao atualizar evento" });
    }
  });

  // Deletar evento
  router.delete("/events/:id", requirePermission("event.delete"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteEvent(id);

      if (!deleted) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      await auditLog(req, "event.delete", { type: "event", id }, {});

      res.json({ message: "Evento removido com sucesso" });
    } catch (err) {
      console.error("[AdminAPI] Delete event error:", err);
      res.status(500).json({ error: "Erro ao deletar evento" });
    }
  });

  /* =========================================
     SALES (VENDAS)
     ========================================= */

  // Listar vendas
  router.get("/sales", requirePermission("sale.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;
      if (!guildId) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      const sales = await db.listGuildSales(guildId);
      res.json({ sales });
    } catch (err) {
      console.error("[AdminAPI] List sales error:", err);
      res.status(500).json({ error: "Erro ao listar vendas" });
    }
  });

  // Criar venda
  router.post("/sales", requirePermission("sale.create"), async (req, res) => {
    try {
      const { guild_id, item_name, price, seller_id, expires_at } = req.body;

      if (!guild_id || !item_name || !price || !seller_id) {
        return res.status(400).json({ error: "guild_id, item_name, price e seller_id são obrigatórios" });
      }

      const guild = await db.getGuildByDiscordId(guild_id);
      if (!guild) {
        return res.status(400).json({ error: "Guild não registrada. Use o comando /setup no Discord primeiro." });
      }

      const sale = await db.createGuildSale({
        guild_id,
        item_name,
        price: parseInt(price),
        seller_id,
        expires_at
      });

      await auditLog(req, "sale.create", { type: "sale", id: sale.id }, { item_name, price });

      res.status(201).json({ sale });
    } catch (err) {
      console.error("[AdminAPI] Create sale error:", err);
      res.status(500).json({ error: "Erro ao criar venda" });
    }
  });

  // Remover venda
  router.delete("/sales/:id", requirePermission("sale.remove"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteGuildSale(id);

      if (!deleted) {
        return res.status(404).json({ error: "Venda não encontrada" });
      }

      await auditLog(req, "sale.remove", { type: "sale", id }, {});

      res.json({ message: "Venda removida com sucesso" });
    } catch (err) {
      console.error("[AdminAPI] Delete sale error:", err);
      res.status(500).json({ error: "Erro ao remover venda" });
    }
  });

  /* =========================================
     ANNOUNCEMENTS (ANÚNCIOS)
     ========================================= */

  // Listar anúncios
  router.get("/announcements", requirePermission("announce.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;
      const limit = parseInt(req.query.limit) || 10;

      if (!guildId) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      const announcements = await db.listAnnouncements(guildId, limit);
      res.json({ announcements });
    } catch (err) {
      console.error("[AdminAPI] List announcements error:", err);
      res.status(500).json({ error: "Erro ao listar anúncios" });
    }
  });

  // Criar anúncio
  router.post("/announcements", requirePermission("announce"), async (req, res) => {
    try {
      const { guild_id, content, channel_id } = req.body;

      if (!guild_id || !content) {
        return res.status(400).json({ error: "guild_id e content são obrigatórios" });
      }

      const guild = await db.getGuildByDiscordId(guild_id);
      if (!guild) {
        return res.status(400).json({ error: "Guild não registrada. Use o comando /setup no Discord primeiro." });
      }

      const announcement = await db.createAnnouncement({
        guild_id,
        content,
        author_id: req.user?.username || "api-key",
        channel_id
      });

      await auditLog(req, "announcement.create", { type: "announcement", id: announcement.id }, { content });

      res.status(201).json({ announcement });
    } catch (err) {
      console.error("[AdminAPI] Create announcement error:", err);
      res.status(500).json({ error: "Erro ao criar anúncio" });
    }
  });

  // Deletar anúncio
  router.delete("/announcements/:id", requirePermission("announce.delete"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteAnnouncement(id);

      if (!deleted) {
        return res.status(404).json({ error: "Anúncio não encontrado" });
      }

      await auditLog(req, "announcement.delete", { type: "announcement", id }, {});

      res.json({ message: "Anúncio removido com sucesso" });
    } catch (err) {
      console.error("[AdminAPI] Delete announcement error:", err);
      res.status(500).json({ error: "Erro ao deletar anúncio" });
    }
  });

  /* =========================================
     AUDIT LOG
     ========================================= */

  // Listar audit log
  router.get("/audit-log", requirePermission("audit.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const action = req.query.action;

      if (!guildId) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      let logs = await db.listGuildAuditLogs(guildId, limit);

      // Filtra por ação se especificado
      if (action) {
        logs = logs.filter(l => l.action === action);
      }

      res.json({ logs });
    } catch (err) {
      console.error("[AdminAPI] List audit log error:", err);
      res.status(500).json({ error: "Erro ao listar audit log" });
    }
  });

  /* =========================================
     STATS
     ========================================= */

  // Estatísticas
  router.get("/stats", requirePermission("stats.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;

      const pool = await db.getPool();

      const [usersCount, eventsCount, salesCount, announcementsCount] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM users"),
        guildId ? pool.query("SELECT COUNT(*) as count FROM events WHERE guild_id = $1", [guildId]) : pool.query("SELECT COUNT(*) as count FROM events"),
        guildId ? pool.query("SELECT COUNT(*) as count FROM guild_sales WHERE guild_id = $1 AND status = 'active'", [guildId]) : pool.query("SELECT COUNT(*) as count FROM guild_sales WHERE status = 'active'"),
        guildId ? pool.query("SELECT COUNT(*) as count FROM announcements WHERE guild_id = $1", [guildId]) : pool.query("SELECT COUNT(*) as count FROM announcements")
      ]);

      res.json({
        users: parseInt(usersCount.rows[0].count),
        events: parseInt(eventsCount.rows[0].count),
        sales: parseInt(salesCount.rows[0].count),
        announcements: parseInt(announcementsCount.rows[0].count)
      });
    } catch (err) {
      console.error("[AdminAPI] Stats error:", err);
      res.status(500).json({ error: "Erro ao obter estatísticas" });
    }
  });

  /* =========================================
     SETTINGS
     ========================================= */

  // Listar configurações
  router.get("/settings", requirePermission("settings.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;
      if (!guildId) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      const guild = await db.getGuildByDiscordId(guildId);
      if (!guild) {
        return res.status(404).json({ error: "Guild não encontrada" });
      }

      res.json({
        guild_id: guild.guild_id,
        guild_name: guild.guild_name,
        twitch_tag: guild.twitch_tag,
        settings: guild.settings
      });
    } catch (err) {
      console.error("[AdminAPI] Get settings error:", err);
      res.status(500).json({ error: "Erro ao obter configurações" });
    }
  });

  // Atualizar configurações
  router.put("/settings", requirePermission("settings.update"), async (req, res) => {
    try {
      const { guild_id, admin_role_id, admin_channel_id, stream_channel_id, twitch_tag, settings } = req.body;

      if (!guild_id) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      const guild = await db.updateGuildConfig(guild_id, {
        admin_role_id,
        admin_channel_id,
        stream_channel_id,
        twitch_tag,
        settings
      });

      await auditLog(req, "settings.update", { type: "guild", id: guild_id }, { twitch_tag, settings });

      res.json({ guild });
    } catch (err) {
      console.error("[AdminAPI] Update settings error:", err);
      res.status(500).json({ error: "Erro ao atualizar configurações" });
    }
  });

  /* =========================================
     PERMISSIONS (GERENCIAMENTO DE ADMINS)
     ========================================= */

  // Listar permissões
  router.get("/permissions", requirePermission("admin.read"), async (req, res) => {
    try {
      const guildId = req.query.guild_id;
      if (!guildId) {
        return res.status(400).json({ error: "guild_id é obrigatório" });
      }

      const permissions = await db.listPermissions(guildId);
      res.json({ permissions });
    } catch (err) {
      console.error("[AdminAPI] List permissions error:", err);
      res.status(500).json({ error: "Erro ao listar permissões" });
    }
  });

  // Conceder permissão
  router.post("/permissions", requirePermission("admin.grant"), async (req, res) => {
    try {
      const { guild_id, user_id, permission } = req.body;

      if (!guild_id || !user_id || !permission) {
        return res.status(400).json({ error: "guild_id, user_id e permission são obrigatórios" });
      }

      const guild = await db.getGuildByDiscordId(guild_id);
      if (!guild) {
        return res.status(400).json({ error: "Guild não registrada. Use o comando /setup no Discord primeiro." });
      }

      const validPermissions = ["master", "guildmaster", "core.admin", "events.admin"];
      if (!validPermissions.includes(permission)) {
        return res.status(400).json({ error: `Permissão inválida. Válidas: ${validPermissions.join(", ")}` });
      }

      const result = await db.grantPermission({
        guild_id,
        user_id,
        permission,
        granted_by: req.user?.username || "api-key"
      });

      await auditLog(req, "admin.grant", { type: "permission", id: user_id }, { permission });

      res.status(201).json({ permission: result });
    } catch (err) {
      console.error("[AdminAPI] Grant permission error:", err);
      res.status(500).json({ error: "Erro ao conceder permissão" });
    }
  });

  // Revogar permissão
  router.delete("/permissions", requirePermission("admin.revoke"), async (req, res) => {
    try {
      // DELETE pode vir via body ou query params
      const guild_id = req.body?.guild_id || req.query.guild_id;
      const user_id = req.body?.user_id || req.query.user_id;
      const permission = req.body?.permission || req.query.permission;

      if (!guild_id || !user_id || !permission) {
        return res.status(400).json({ error: "guild_id, user_id e permission são obrigatórios" });
      }

      const revoked = await db.revokePermission(guild_id, user_id, permission);

      if (!revoked) {
        return res.status(404).json({ error: "Permissão não encontrada" });
      }

      await auditLog(req, "admin.revoke", { type: "permission", id: user_id }, { permission });

      res.json({ message: "Permissão revogada com sucesso" });
    } catch (err) {
      console.error("[AdminAPI] Revoke permission error:", err);
      res.status(500).json({ error: "Erro ao revogar permissão" });
    }
  });

  /* =========================================
     GUILDS (MULTI-TENANT)
     ========================================= */

  // Registrar nova guild
  router.post("/guilds", async (req, res) => {
    try {
      const { guild_id, guild_name, guild_icon } = req.body;

      if (!guild_id || !guild_name) {
        return res.status(400).json({ error: "guild_id e guild_name são obrigatórios" });
      }

      const guild = await db.createGuild({
        guild_id,
        guild_name,
        guild_icon
      });

      res.status(201).json({ guild });
    } catch (err) {
      console.error("[AdminAPI] Create guild error:", err);
      res.status(500).json({ error: "Erro ao registrar guild" });
    }
  });

  // Obter guild
  router.get("/guilds/:guildId", async (req, res) => {
    try {
      const guild = await db.getGuildByDiscordId(req.params.guildId);
      if (!guild) {
        return res.status(404).json({ error: "Guild não encontrada" });
      }
      res.json({ guild });
    } catch (err) {
      console.error("[AdminAPI] Get guild error:", err);
      res.status(500).json({ error: "Erro ao obter guild" });
    }
  });

  return router;
}

module.exports = { createAdminApiRouter };
