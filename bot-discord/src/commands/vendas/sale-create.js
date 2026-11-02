"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { formatGold } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("venda")
    .setDescription("Criar nova venda")
    .addStringOption((opt) =>
      opt.setName("item").setDescription("Nome do item").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("preco").setDescription("Preço em gold").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("vendedor").setDescription("ID do vendedor").setRequired(true)
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("sale.create", userRoles)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Sem permissão",
            `Seu nível: **${getUserLevel(userRoles) || "sem acesso"}**\n` +
              `Nível necessário: **guildmaster** ou superior.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const itemName = interaction.options.getString("item");
    const price = interaction.options.getInteger("preco");
    const sellerId = interaction.options.getString("vendedor");

    await interaction.deferReply();

    try {
      const result = await api.createSale({
        guild_id: interaction.guild.id,
        item_name: itemName,
        price,
        seller_id: sellerId,
      });

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Venda criada!",
            `📦 **${itemName}**\n` +
              `💰 ${formatGold(price)}\n` +
              `👤 Vendedor: ${sellerId}\n` +
              `📝 ID: ${result.sale.id}`
          ),
        ],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
