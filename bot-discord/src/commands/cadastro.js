"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../lib/api-client");
const { successEmbed, errorEmbed } = require("../utils/embeds");

// Cooldown simples por usuário para evitar spam (60s)
const cooldowns = new Map();
const COOLDOWN_MS = 60_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cadastro")
    .setDescription("Criar sua conta no site da BRAZUG (reciba o link por e-mail)")
    .addStringOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Nome de usuário do site (3-32: minúsculas, números ou _)")
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(32)
    )
    .addStringOption((opt) =>
      opt
        .setName("email")
        .setDescription("Seu e-mail (vai receber o link de ativação)")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Resposta privada: ninguém na guild vê seus dados
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const username = interaction.options.getString("usuario").trim().toLowerCase();
    const email = interaction.options.getString("email").trim().toLowerCase();

    // Validações client-side (rápidas) antes de chamar a API
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "Usuário inválido",
            "Use de 3 a 32 caracteres: letras minúsculas, números ou _ (ex.: \u0060ggmax_alt\u0060)."
          ),
        ],
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return interaction.editReply({
        embeds: [errorEmbed("E-mail inválido", "Confira o endereço: \u0060nome@dominio.com\u0060")],
      });
    }

    // Cooldown por Discord ID
    const last = cooldowns.get(interaction.user.id) || 0;
    if (Date.now() - last < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
      return interaction.editReply({
        embeds: [errorEmbed("Calma aí, guerreiro", `Tente de novo em **${wait}s**.`)],
      });
    }
    cooldowns.set(interaction.user.id, Date.now());

    try {
      const result = await api.register({
        username,
        email,
        discord_id: interaction.user.id,
        discord_tag: interaction.user.tag,
      });

      const setupUrl = result.setup_url;
      if (!setupUrl) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              "Conta criada",
              `Sua conta **${result.user.username}** foi criada, mas o link de senha não foi retornado. ` +
                `Abra o e-mail enviado para **${email}** (confira o spam) ou use "Esqueci minha senha" no site.`
            ),
          ],
        });
      }

      const emailNote = result.email_sent
        ? `📧 Uma cópia de segurança também foi enviada para **${email}**.`
        : `⚠️ O envio do e-mail de segurança falhou, mas o link acima já ativa sua conta.`;

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Cadastro realizado!",
            `👤 Usuário: **${result.user.username}**\n` +
              `🔗 **Defina sua senha:**\n${setupUrl}\n\n` +
              `**Próximos passos:**\n` +
              `1️⃣ Abra o link e escolha sua senha — a conta é ativada na hora\n` +
              `2️⃣ Entre no site com seu usuário ou e-mail\n\n` +
              `${emailNote}\n\n` +
              `⚠️ Este link é pessoal e expira em 48h. Não compartilhe: quem tiver ele pode definir sua senha.`
          ),
        ],
      });

      // Cópia na DM (se a pessoa fechar as DMs, o link já está na resposta acima)
      try {
        await interaction.user.send({
          embeds: [
            successEmbed(
              "Seu link de senha — BRAZUG",
              `👤 Usuário: **${result.user.username}**\n🔗 ${setupUrl}\n\n` +
                `Válido por 48h. Não compartilhe este link.`
            ),
          ],
        });
      } catch (dmErr) {
        // DM bloqueada: sem problema, a mensagem efêmera já contém o link
      }
    } catch (err) {
      // 409 = usuário/e-mail já cadastrado: aponta o caminho de recuperação
      const siteUrl = (() => {
        try {
          return new URL(process.env.ADMIN_API_BASE_URL || "http://localhost:3000").origin;
        } catch (e) {
          return "https://brazug.com";
        }
      })();

      const description =
        err.status === 401
          ? "A API recusou a credencial do bot (ADMIN_API_KEY). Avise a liderança para atualizar a chave no servidor."
          : err.status === 409
          ? `${err.message}\n\nJá tem conta? Recupere o acesso em ${siteUrl}/forgot-password.html — ` +
            `o link de nova senha chega por e-mail e também por DM aqui no Discord (se seu Discord estiver vinculado).`
          : err.message;

      await interaction.editReply({
        embeds: [errorEmbed("Não foi possível cadastrar", description)],
      });
    }
  },
};
