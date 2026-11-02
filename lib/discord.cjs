"use strict";

/**
 * Envio de DM pelo bot do Discord.
 *
 * Usado para entregar o link de redefinição de senha também no Discord,
 * mantendo o e-mail como cópia de segurança.
 *
 * Requer DISCORD_BOT_TOKEN no .env. Nunca lança exceção: retorna
 * { sent: false, reason } para que o fluxo principal (e-mail) siga normal.
 */

const API = "https://discord.com/api/v10";

function getToken() {
  return process.env.DISCORD_BOT_TOKEN || "";
}

async function sendDirectMessage(discordId, content) {
  const token = getToken();
  if (!token) return { sent: false, reason: "bot_token_missing" };
  if (!discordId) return { sent: false, reason: "discord_id_missing" };

  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json"
  };
  const signal = AbortSignal.timeout(8000);

  try {
    // Abre (ou reaproveita) o canal de DM com o usuário
    const channelRes = await fetch(`${API}/users/@me/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({ recipient_id: String(discordId) }),
      signal
    });
    if (!channelRes.ok) {
      return { sent: false, reason: `dm_channel_${channelRes.status}` };
    }
    const channel = await channelRes.json();

    const msgRes = await fetch(`${API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
      signal
    });
    if (!msgRes.ok) {
      return { sent: false, reason: `dm_message_${msgRes.status}` };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err && err.name === "TimeoutError" ? "timeout" : String(err && err.message)
    };
  }
}

module.exports = { sendDirectMessage };
