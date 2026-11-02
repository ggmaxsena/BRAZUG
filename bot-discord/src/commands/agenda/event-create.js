"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { formatDate } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evento")
    .setDescription("Criar novo evento")
    .addStringOption((opt) =>
      opt.setName("titulo").setDescription("Título do evento").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("data").setDescription("Data (DD/MM/YYYY)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("hora").setDescription("Hora (HH:MM)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("tipo")
        .setDescription("Tipo do evento")
        .addChoices(
          { name: "Raid", value: "raid" },
          { name: "Arena", value: "arena" },
          { name: "Battleground", value: "bg" },
          { name: "Outro", value: "other" }
        )
    )
    .addStringOption((opt) =>
      opt.setName("descricao").setDescription("Descrição do evento")
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("event.create", userRoles)) {
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

    const title = interaction.options.getString("titulo");
    const dateStr = interaction.options.getString("data");
    const time = interaction.options.getString("hora");
    const type = interaction.options.getString("tipo") || "raid";
    const description = interaction.options.getString("descricao");

    // Converte data para ISO
    const [day, month, year] = dateStr.split("/");
    const eventDate = new Date(`${year}-${month}-${day}T${time}:00`);

    await interaction.deferReply();

    try {
      const result = await api.createEvent({
        guild_id: interaction.guild.id,
        title,
        description,
        event_date: eventDate.toISOString(),
        event_type: type,
      });

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Evento criado!",
            `📅 **${title}**\n` +
              `🕐 ${formatDate(eventDate)}\n` +
              `🏷️ Tipo: **${type}**\n` +
              `📝 ID: ${result.event.id}`
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
