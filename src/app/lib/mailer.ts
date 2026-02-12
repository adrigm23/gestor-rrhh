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
    console.warn("SMTP no configurado. Email de restablecimiento no enviado.");
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

const formatMb = (value: number) => `${value.toFixed(2)} MB`;

export const sendDbUsageAlertEmail = async (params: {
  to: string;
  stats: {
    mb: number;
    limitMb: number;
    percent: number;
    level: string;
    planLabel: string;
  };
}) => {
  if (!isConfigured()) {
    console.warn("SMTP no configurado. Email de alerta no enviado.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  const subjectPrefix =
    params.stats.level === "critical"
      ? "ALERTA CRITICA"
      : params.stats.level === "high"
        ? "Alerta alta"
        : "Aviso";

  const text = [
    `${subjectPrefix}: uso de base de datos`,
    "",
    `Plan: ${params.stats.planLabel}`,
    `Uso actual: ${formatMb(params.stats.mb)}`,
    `Limite configurado: ${formatMb(params.stats.limitMb)}`,
    `Porcentaje: ${params.stats.percent.toFixed(1)}%`,
    "",
    "Recomendacion: actualiza el plan antes de llegar al modo solo lectura.",
  ].join("\n");

  await transporter.sendMail({
    from: SMTP_FROM,
    to: params.to,
    subject: `${subjectPrefix} - Uso de base de datos`,
    text,
  });

  return true;
};
