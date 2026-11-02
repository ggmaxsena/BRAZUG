"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { infoEmbed, errorEmbed } = require("../../utils/embeds");
const { formatDate } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("audit")
    .setDescription("Ver últimos logs de auditoria")
    .addIntegerOption((opt) =>
      opt.setName("limite").setDescription("Quantidade de logs (padrão: 10)")
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("audit.read", userRoles)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Sem permissão",
            `Seu nível: **${getUserLevel(userRoles) || "sem acesso"}**\n` +
              `Nível necessário: **core.admin** ou superior.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const limit = interaction.options.getInteger("limite") || 10;

    await interaction.deferReply();

    try {
      const result = await api.listAuditLogs(interaction.guild.id, limit);
      const logs = result.logs || [];

      if (logs.length === 0) {
        return interaction.editReply({
          embeds: [infoEmbed("📋 Audit Log", "Nenhum log encontrado.")],
        });
      }

      const fields = logs.slice(0, 10).map((log, i) => ({
        name: `${i + 1}. ${log.action}`,
        value: `👤 ${log.admin_username || "api-key"} | 🕐 ${formatDate(log.created_at)}`,
        inline: false,
      }));

      await interaction.editReply({
        embeds: [infoEmbed(`📋 Últimos Logs (${logs.length})`, fields)],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
