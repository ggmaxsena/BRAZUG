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
  const logoUrl = `${process.env.BASE_URL}/assets/branding/LOGO.png`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 40px; border-radius: 8px; border: 2px solid #8c1616; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="BRAZUG" style="max-width: 180px; filter: drop-shadow(0 0 10px rgba(140, 22, 22, 0.5));">
      </div>
      
      <h1 style="color: #f7b500; text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #333; padding-bottom: 15px;">Pela Horda, ${username}!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-top: 25px;">Sua jornada na guilda <strong>BRAZUG</strong> está prestes a começar. Para garantir seu lugar entre os heróis e ativar sua conta, clique no botão de ativação abaixo:</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background: #8c1616; color: #ffffff; padding: 15px 35px; text-decoration: none; font-weight: bold; border-radius: 4px; border: 1px solid #f7b500; box-shadow: 0 4px 15px rgba(140, 22, 22, 0.4); text-transform: uppercase;">Ativar Minha Conta</a>
      </div>
      
      <p style="font-size: 14px; color: #888; border-top: 1px solid #333; padding-top: 20px; text-align: center;">Lok'tar Ogar! Se você não solicitou este cadastro, pode ignorar este corvo mensageiro.</p>
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
  const resetUrl = `${process.env.BASE_URL}/reset-password.html?token=${token}`;
  const logoUrl = `${process.env.BASE_URL}/assets/branding/LOGO.png`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 40px; border-radius: 8px; border: 2px solid #8c1616; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="BRAZUG" style="max-width: 180px; filter: drop-shadow(0 0 10px rgba(140, 22, 22, 0.5));">
      </div>
      
      <h1 style="color: #f7b500; text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #333; padding-bottom: 15px;">Recuperação de Acesso</h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-top: 25px;">Olá ${username}, recebemos uma solicitação para redefinir sua senha na guilda <strong>BRAZUG</strong>.</p>
      <p style="font-size: 16px; line-height: 1.6;">Clique no botão abaixo para escolher uma nova senha e retornar ao campo de batalha. Este link é válido por apenas 1 hora.</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #8c1616; color: #ffffff; padding: 15px 35px; text-decoration: none; font-weight: bold; border-radius: 4px; border: 1px solid #f7b500; box-shadow: 0 4px 15px rgba(140, 22, 22, 0.4); text-transform: uppercase;">Redefinir Minha Senha</a>
      </div>
      
      <p style="font-size: 14px; color: #888; border-top: 1px solid #333; padding-top: 20px; text-align: center;">Sangue e Trovão! Se você não solicitou a troca de senha, sua conta continua segura.</p>
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
