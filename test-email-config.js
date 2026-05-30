require('dotenv').config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.brazug.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER || "noreply@brazug.com",
    pass: process.env.SMTP_PASS || "",
  },
});

console.log("Checking SMTP configuration...");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("User:", process.env.SMTP_USER);
console.log("Secure:", process.env.SMTP_SECURE);

transporter.verify(function (error, success) {
  if (error) {
    console.log("Verification failed:");
    console.error(error);
  } else {
    console.log("Server is ready to take our messages");
  }
  process.exit(0);
});
