"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getGuildConfig } = require("../lib/guild-config");
const { hasPermission } = require("../lib/permissions");
const { infoEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Ver configurações da guild"),

  async execute(interaction) {
    await interaction.deferReply();
    const guildConfig = await getGuildConfig(interaction.guild.id);

    if (!guildConfig) {
      return interaction.editReply({
        embeds: [errorEmbed("Guild não configurada", "Use `/setup` primeiro.")],
      });
    }

    await interaction.editReply({
      embeds: [
        infoEmbed(`Configurações - ${guildConfig.guild_name}`, [
          { name: "🏷️ Tag Twitch", value: guildConfig.twitch_tag || "N/A", inline: true },
          { name: "📋 Canal Admin", value: guildConfig.admin_channel_id ? `<#${guildConfig.admin_channel_id}>` : "N/A", inline: true },
          { name: "📺 Canal Streams", value: guildConfig.stream_channel_id ? `<#${guildConfig.stream_channel_id}>` : "N/A", inline: true },
          { name: "🎭 Cargo Admin", value: guildConfig.admin_role_id ? `<@&${guildConfig.admin_role_id}>` : "N/A", inline: true },
        ]),
      ],
    });
  },
};
