"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission } = require("../../lib/permissions");
const { infoEmbed, errorEmbed } = require("../../utils/embeds");
const { formatNumber } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Ver estatísticas da guild"),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("stats.read", userRoles)) {
      return interaction.reply({
        embeds: [errorEmbed("Sem permissão", "Você não tem permissão para ver estatísticas.")],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    try {
      const result = await api.getStats(interaction.guild.id);

      await interaction.editReply({
        embeds: [
          infoEmbed(`📊 Estatísticas - ${interaction.guild.name}`, [
            { name: "👥 Usuários", value: formatNumber(result.users), inline: true },
            { name: "📅 Eventos", value: formatNumber(result.events), inline: true },
            { name: "🛒 Vendas Ativas", value: formatNumber(result.sales), inline: true },
            { name: "📢 Anúncios", value: formatNumber(result.announcements), inline: true },
          ]),
        ],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
