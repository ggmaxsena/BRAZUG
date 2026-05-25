"use strict";

const nodemailer = require("nodemailer");

/**
 * Configuração do SMTP para noreply@brazug.com
 * Os valores devem ser definidos no arquivo .env
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.brazug.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false", // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER || "noreply@brazug.com",
    pass: process.env.SMTP_PASS || "",
  },
});

async function sendVerificationEmail(to, username, token) {
  const verifyUrl = `${process.env.BASE_URL}/api/auth/verify?token=${token}`;
  
  const html = `
    <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; border-radius: 12px; border: 1px solid #333;">
      <h1 style="color: #f7b500;">Bem-vindo à BRAZUG, ${username}!</h1>
      <p style="font-size: 16px; line-height: 1.6;">Para ativar sua conta e começar sua jornada na Horda, confirme seu e-mail clicando no botão abaixo:</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #f7b500; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; margin-top: 20px;">VERIFICAR CONTA</a>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">Se você não criou esta conta, ignore este e-mail.</p>
    </div>
  `;

  return transporter.sendMail({
    from: `"BRAZUG" <${process.env.SMTP_USER || "noreply@brazug.com"}>`,
    to,
    subject: "Ative sua conta - BRAZUG",
    html,
  });
}

async function sendResetPasswordEmail(to, username, token) {
  const resetUrl = `${process.env.BASE_URL}/api/auth/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; border-radius: 12px; border: 1px solid #333;">
      <h1 style="color: #f7b500;">Recuperação de Senha</h1>
      <p style="font-size: 16px; line-height: 1.6;">Olá ${username}, recebemos uma solicitação para redefinir sua senha na BRAZUG.</p>
      <p>Clique no botão abaixo para escolher uma nova senha. Este link expira em 1 hora.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #f7b500; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; margin-top: 20px;">REDEFINIR SENHA</a>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
    </div>
  `;

  return transporter.sendMail({
    from: `"BRAZUG" <${process.env.SMTP_USER || "noreply@brazug.com"}>`,
    to,
    subject: "Recuperação de Senha - BRAZUG",
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};
