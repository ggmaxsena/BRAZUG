"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evento-delete")
    .setDescription("Remover evento")
    .addStringOption((opt) =>
      opt.setName("id").setDescription("ID do evento").setRequired(true)
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("event.delete", userRoles)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Sem permissão",
            `Seu nível: **${getUserLevel(userRoles) || "sem acesso"}**\n` +
              `Nível necessário: **events.admin** ou superior.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const id = interaction.options.getString("id");

    await interaction.deferReply();

    try {
      await api.deleteEvent(id);

      await interaction.editReply({
        embeds: [successEmbed("Evento removido!", `📝 ID: ${id}`)],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
