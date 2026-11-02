"use strict";

const { SlashCommandBuilder, MessageFlags, ChannelType } = require("discord.js");
const api = require("../../lib/api-client");
const { hasPermission, getUserLevel } = require("../../lib/permissions");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anuncio")
    .setDescription("Postar anúncio no canal")
    .addStringOption((opt) =>
      opt.setName("mensagem").setDescription("Mensagem do anúncio").setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName("canal")
        .setDescription("Canal para postar (padrão: canal atual)")
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const userRoles = interaction.member.roles.cache.map((r) => r.name);

    if (!hasPermission("announce", userRoles)) {
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

    const content = interaction.options.getString("mensagem");
    const targetChannel = interaction.options.getChannel("canal") || interaction.channel;

    await interaction.deferReply();

    try {
      // Registra no backend
      await api.createAnnouncement({
        guild_id: interaction.guild.id,
        content,
        channel_id: targetChannel.id,
      });

      // Posta no canal
      await targetChannel.send({
        embeds: [
          successEmbed("📢 ANÚNCIO", content).setFooter({
            text: `Por: ${interaction.user.tag}`,
          }),
        ],
      });

      await interaction.editReply({
        embeds: [successEmbed("Anúncio postado!", `📺 Canal: #${targetChannel.name}`)],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed("Erro", err.message)],
      });
    }
  },
};
