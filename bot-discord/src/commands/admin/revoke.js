"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("revoke")
    .setDescription("Revogar permissão de admin (apenas Master)")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuário a rebaixar").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("nivel")
        .setDescription("Nível a revogar")
        .setRequired(true)
        .addChoices(
          { name: "Admin de Eventos", value: "events.admin" },
          { name: "Admin de Core", value: "core.admin" },
          { name: "Guildmaster", value: "guildmaster" },
          { name: "Admin Master", value: "master" }
        )
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("admin.revoke", userRoles)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Sem permissão",
            `Apenas **Admin Master** pode revogar permissões.\n` +
              `Seu nível: **${getUserLevel(userRoles) || "sem acesso"}**`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const target = interaction.options.getUser("usuario");
    const level = interaction.options.getString("nivel");

    await interaction.deferReply();

    try {
      await api.revokePermission({
        guild_id: interaction.guild.id,
        user_id: target.id,
        permission: level,
      });

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Permissão revogada!",
            `👤 Usuário: ${target.tag}\n` +
              `🎖️ Nível removido: **${level}**\n` +
              `👤 Revogado por: ${interaction.user.tag}`
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
