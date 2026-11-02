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
    .setName("ban")
    .setDescription("Banir usuário do site BRAZUG")
    .addStringOption((opt) =>
      opt.setName("usuario").setDescription("Username do site").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("motivo").setDescription("Motivo do ban").setRequired(true)
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("user.ban", userRoles)) {
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
    const reason = interaction.options.getString("motivo");

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

      if (siteUser.role === "banned") {
        return interaction.editReply({
          embeds: [errorEmbed("Já banido", `**${siteUser.username}** já está banido.`)],
        });
      }

      const result = await api.banUser(siteUser.id, reason);

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Usuário banido!",
            `👤 **${result.user.username}** banido do site com sucesso.\n` +
              `📋 Motivo: ${reason}\n` +
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
