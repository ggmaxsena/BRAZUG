"use strict";

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChannelType } = require("discord.js");
const { registerGuild, clearCache, getGuildConfig } = require("../lib/guild-config");
const api = require("../lib/api-client");
const { successEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Registrar e configurar o bot para esta guild")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("canal_admin")
        .setDescription("Canal onde os admins usam os comandos")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((opt) =>
      opt
        .setName("canal_streams")
        .setDescription("Canal que recebe alertas de stream ao vivo")
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    // Apenas administradores do Discord podem configurar
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [
          errorEmbed("Sem permissão", "Apenas administradores do servidor podem usar este comando."),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    // 1. Registra a guild no backend (idempotente: atualiza se já existir)
    const guild = await registerGuild(
      interaction.guild.id,
      interaction.guild.name,
      interaction.guild.iconURL()
    );

    if (!guild) {
      return interaction.editReply({
        embeds: [errorEmbed("Erro", "Falha ao registrar a guild no backend.")],
      });
    }

    // 2. Salva os canais escolhidos (se informados)
    const canalAdmin = interaction.options.getChannel("canal_admin");
    const canalStreams = interaction.options.getChannel("canal_streams");

    if (canalAdmin || canalStreams) {
      try {
        await api.updateSettings({
          guild_id: interaction.guild.id,
          admin_channel_id: canalAdmin ? canalAdmin.id : guild.admin_channel_id || null,
          stream_channel_id: canalStreams ? canalStreams.id : guild.stream_channel_id || null,
          twitch_tag: guild.twitch_tag,
          settings: guild.settings || {},
        });
        clearCache(interaction.guild.id);
      } catch (err) {
        console.error("[Setup] Erro ao salvar canais:", err.message);
      }
    }

    const configAtual = await getGuildConfig(interaction.guild.id);

    await interaction.editReply({
      embeds: [
        successEmbed(
          `Bot configurado para ${guild.guild_name}!`,
          `📋 Configurações:\n` +
            `• Canal de comandos: ${configAtual && configAtual.admin_channel_id ? `<#${configAtual.admin_channel_id}>` : "não definido"}\n` +
            `• Canal de streams: ${configAtual && configAtual.stream_channel_id ? `<#${configAtual.stream_channel_id}>` : "não definido"}\n\n` +
            `Alertas de stream ao vivo serão enviados no canal de streams.\n` +
            `Use \`/config\` para ver as configurações.`
        ),
      ],
    });
  },
};
