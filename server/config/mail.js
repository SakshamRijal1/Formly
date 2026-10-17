
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure:
    process.env.SMTP_SECURE === "true" ||
    Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  const from = process.env.SMTP_FROM;

  // Give a clear error instead of sending an invalid email.
  if (!process.env.SMTP_HOST) {
    throw new Error("Email configuration missing: SMTP_HOST");
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email configuration missing: SMTP_USER or SMTP_PASS");
  }

  if (!from || !from.includes("@")) {
    throw new Error("Invalid SMTP_FROM. Set it to your verified sender email.");
  }

  if (!to || !subject || !html) {
    throw new Error("Email recipient, subject and HTML content are required.");
  }

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export default transporter;
