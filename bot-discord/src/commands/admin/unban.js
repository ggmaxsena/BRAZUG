"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

/**
 * Busca um usuário do site BRAZUG pelo username (busca exata, case-insensitive)
 */
async function findSiteUser(username) {
  const res = await api.listUsers(1, 20, username);
  const users = res.users || [];
  return users.find((u) => (u.username || "").toLowerCase() === username.toLowerCase()) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Desbanir usuário do site BRAZUG")
    .addStringOption((opt) =>
      opt.setName("usuario").setDescription("Username do site").setRequired(true)
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("user.unban", userRoles)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Sem permissão",
            `Seu nível: **${getUserLevel(userRoles) || "sem acesso"}**\n` +
              `Nível necessário: **Ancião (guildmaster)** ou superior.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const username = interaction.options.getString("usuario");

    await interaction.deferReply();

    try {
      const siteUser = await findSiteUser(username);

      if (!siteUser) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              "Usuário não encontrado",
              `Nenhum usuário do site com o nome **${username}**.`
            ),
          ],
        });
      }

      if (siteUser.role !== "banned") {
        return interaction.editReply({
          embeds: [errorEmbed("Não está banido", `**${siteUser.username}** não está banido.`)],
        });
      }

      const result = await api.unbanUser(siteUser.id);

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Usuário desbanido!",
            `👤 **${result.user.username}** voltou a ter acesso ao site.\n` +
              `👤 Executado por: ${interaction.user.tag}`
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
