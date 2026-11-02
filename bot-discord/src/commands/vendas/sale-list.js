"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission } = require("../../lib/permissions");
const { infoEmbed, errorEmbed } = require("../../utils/embeds");
const { formatGold } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vendas")
    .setDescription("Listar vendas ativas"),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("sale.read", userRoles)) {
      return interaction.reply({
        embeds: [errorEmbed("Sem permissão", "Você não tem permissão para ver vendas.")],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    try {
      const result = await api.listSales(interaction.guild.id);
      const sales = result.sales || [];

      if (sales.length === 0) {
        return interaction.editReply({
          embeds: [infoEmbed("🛒 Vendas", "Nenhuma venda ativa.")],
        });
      }

      const fields = sales.slice(0, 10).map((sale, i) => ({
        name: `${i + 1}. ${sale.item_name}`,
        value: `💰 ${formatGold(sale.price)} | 👤 ${sale.seller_id}`,
        inline: false,
      }));

      await interaction.editReply({
        embeds: [infoEmbed(`🛒 Vendas Ativas (${sales.length})`, fields)],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
