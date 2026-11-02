"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission } = require("../../lib/permissions");
const { infoEmbed, errorEmbed } = require("../../utils/embeds");
const { formatDate } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("eventos")
    .setDescription("Listar próximos eventos"),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("event.read", userRoles)) {
      return interaction.reply({
        embeds: [errorEmbed("Sem permissão", "Você não tem permissão para ver eventos.")],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    try {
      const result = await api.listEvents(interaction.guild.id);
      const events = result.events || [];

      if (events.length === 0) {
        return interaction.editReply({
          embeds: [infoEmbed("📅 Eventos", "Nenhum evento agendado.")],
        });
      }

      const fields = events.slice(0, 10).map((event, i) => ({
        name: `${i + 1}. ${event.title}`,
        value: `🕐 ${formatDate(event.event_date)} | 🏷️ ${event.event_type}`,
        inline: false,
      }));

      await interaction.editReply({
        embeds: [infoEmbed(`📅 Próximos Eventos (${events.length})`, fields)],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
