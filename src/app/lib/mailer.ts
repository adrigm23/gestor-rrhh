"use server";

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

const isConfigured = () => SMTP_HOST && SMTP_FROM;

export const sendPasswordResetEmail = async (params: {
  to: string;
  name?: string | null;
  resetUrl: string;
}) => {
  if (!isConfigured()) {
    console.warn("SMTP no configurado. Link de reset:", params.resetUrl);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  const displayName = params.name ? `Hola ${params.name}` : "Hola";

  const text = [
    `${displayName},`,
    "",
    "Has solicitado restablecer tu contrasena.",
    `Enlace: ${params.resetUrl}`,
    "",
    "Si no fuiste tu, ignora este correo.",
  ].join("\n");

  await transporter.sendMail({
    from: SMTP_FROM,
    to: params.to,
    subject: "Restablecer contrasena",
    text,
  });
};
