"use server";

import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { sendPasswordResetEmail } from "../lib/mailer";

export type PasswordResetState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: PasswordResetState = { status: "success" };
const emptyError: PasswordResetState = { status: "error" };
const TOKEN_TTL_MINUTES = 30;
const RESET_WINDOW_MINUTES = 15;
const RESET_MAX_REQUESTS = 3;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getAppUrl = () => {
  const direct = process.env.APP_URL?.trim();
  if (direct) {
    return direct.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("APP_URL no configurado");
};

export async function solicitarResetPassword(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";

  if (!email) {
    return { ...emptyError, message: "Introduce un correo valido." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, nombre: true, email: true },
  });

  if (usuario) {
    const windowStart = new Date(
      Date.now() - RESET_WINDOW_MINUTES * 60 * 1000,
    );
    const recentRequests = await prisma.passwordResetToken.count({
      where: {
        usuarioId: usuario.id,
        createdAt: { gte: windowStart },
      },
    });

    if (recentRequests >= RESET_MAX_REQUESTS) {
      return {
        ...emptySuccess,
        message: "Si el correo existe, recibiras un enlace para restablecer.",
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.updateMany({
      where: { usuarioId: usuario.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    await sendPasswordResetEmail({
      to: usuario.email,
      name: usuario.nombre,
      resetUrl,
    });
  }

  return {
    ...emptySuccess,
    message: "Si el correo existe, recibiras un enlace para restablecer.",
  };
}

export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const token = formData.get("token")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return { ...emptyError, message: "Token invalido." };
  }

  if (!newPassword.trim()) {
    return { ...emptyError, message: "Introduce una contrasena valida." };
  }

  if (newPassword !== confirmPassword) {
    return { ...emptyError, message: "Las contrasenas no coinciden." };
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { usuario: { select: { id: true } } },
  });

  if (!resetToken || resetToken.usedAt) {
    return { ...emptyError, message: "Token invalido o usado." };
  }

  if (resetToken.expiresAt < new Date()) {
    return { ...emptyError, message: "Token expirado." };
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.usuario.update({
    where: { id: resetToken.usuario.id },
    data: { password: hashedPassword, passwordMustChange: false },
  });

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.updateMany({
    where: { usuarioId: resetToken.usuario.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return { ...emptySuccess, message: "Contrasena restablecida." };
}
