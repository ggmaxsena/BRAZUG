"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission } = require("../../lib/permissions");
const { infoEmbed, errorEmbed } = require("../../utils/embeds");
const { formatDate } = require("../../utils/format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Ver detalhes de um usuário do site")
    .addStringOption((opt) =>
      opt.setName("usuario").setDescription("Username do site").setRequired(true)
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("user.read", userRoles)) {
      return interaction.reply({
        embeds: [errorEmbed("Sem permissão", "Você não tem permissão para ver detalhes de usuários.")],
        flags: MessageFlags.Ephemeral,
      });
    }

    const username = interaction.options.getString("usuario");

    await interaction.deferReply();

    try {
      const res = await api.listUsers(1, 20, username);
      const users = res.users || [];
      const user = users.find((u) => (u.username || "").toLowerCase() === username.toLowerCase());

      if (!user) {
        return interaction.editReply({
          embeds: [
            infoEmbed(`Usuário: ${username}`, `Nenhum usuário do site com esse nome.`),
          ],
        });
      }

      const roleLabels = {
        admin: "Admin (site)",
        guildmaster: "Guildmaster",
        officer: "Officer",
        guildmember: "Membro",
        banned: "🚫 BANIDO",
      };

      await interaction.editReply({
        embeds: [
          infoEmbed(`👤 ${user.username}`, [
            { name: "🎖️ Papel", value: roleLabels[user.role] || user.role, inline: true },
            { name: "✉️ Email", value: user.email || "sem email", inline: true },
            { name: "✅ Verificado", value: user.is_verified ? "Sim" : "Não", inline: true },
            { name: "📅 Registro", value: formatDate(user.created_at), inline: true },
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
