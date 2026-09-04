"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { sendPasswordResetEmail } from "../lib/mailer";
import { getClientIp } from "../lib/client-ip";
import { PasswordPolicySchema } from "@gestor-rrhh/shared";
import { authService } from "../../services/auth";
import { isLoginBlocked, recordLoginAttempt } from "../../services/auth/login-throttle";
import {
  sanitizeFormDataEmail,
  sanitizeFormDataString,
} from "../utils/input";

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

  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  if (nextAuth) {
    return nextAuth.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return null;
};

const genericPending: PasswordResetState = {
  ...emptySuccess,
  message: "Si el correo existe, recibiras un enlace para restablecer.",
};

export async function solicitarResetPassword(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const email = sanitizeFormDataEmail(formData, "email");

  if (!email) {
    return { ...emptyError, message: "Introduce un correo valido." };
  }

  // Auditoría de seguridad (Fase 2.19, hallazgo #10): antes solo había un
  // límite por usuario (RESET_MAX_REQUESTS); nada frenaba a alguien barriendo
  // muchos emails distintos desde la misma IP para enumerar cuáles existen.
  // Se reutiliza LoginThrottle (respaldado en BD) tratando cada petición
  // como "fallo" a propósito: aquí no hay noción de intento "correcto" que
  // deba resetear el contador, cada petición cuenta igual exista o no la cuenta.
  const ipKey = `pwreset:ip:${getClientIp(await headers())}`;
  if (await isLoginBlocked(ipKey)) {
    return genericPending;
  }
  await recordLoginAttempt(ipKey, false);

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
      return genericPending;
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

    const appUrl = getAppUrl();
    if (!appUrl) {
      console.error("APP_URL/NEXTAUTH_URL no configurado para reset password.");
      return genericPending;
    }

    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    // Auditoría de seguridad (Fase 2.19, hallazgo #10): antes se esperaba
    // (await) el envío SMTP aquí, lo que hacía la respuesta claramente más
    // lenta cuando el email SÍ existe frente a cuando no — un canal de
    // temporización que permite enumerar cuentas aunque el mensaje sea
    // idéntico en ambos casos. Al no esperar el envío, la respuesta al
    // formulario ya no depende de la latencia del SMTP.
    void sendPasswordResetEmail({
      to: usuario.email,
      name: usuario.nombre,
      resetUrl,
    }).catch((error) => {
      console.error("Error enviando email de reset password:", error);
    });
  }

  return genericPending;
}

export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const token = sanitizeFormDataString(formData, "token", { maxLength: 128 });
  const newPassword = sanitizeFormDataString(formData, "newPassword", {
    trim: false,
    maxLength: 256,
  });
  const confirmPassword = sanitizeFormDataString(formData, "confirmPassword", {
    trim: false,
    maxLength: 256,
  });

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return { ...emptyError, message: "Token invalido." };
  }

  // Auditoría de seguridad (Fase 2.19, hallazgo #8): antes esto solo
  // comprobaba que no estuviera vacío — el reset de autoservicio era el
  // único de los cuatro sitios donde se fija una contraseña que no
  // aplicaba ningún mínimo. Mismo PasswordPolicySchema que el resto.
  const policyResult = PasswordPolicySchema.safeParse(newPassword);
  if (!policyResult.success) {
    return {
      ...emptyError,
      message: policyResult.error.issues[0]?.message ?? "Contrasena invalida.",
    };
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

  // Auditoría de seguridad (Fase 2.19, hallazgo #2): este flujo de
  // autoservicio (token por email) actualiza la contraseña directamente
  // aquí, sin pasar por usuarioService.resetPassword — así que el fix
  // aplicado allí no cubría este camino. Si el motivo del reset es un token
  // robado, sin esto el atacante seguía dentro en cualquier móvil ya logueado.
  await authService.revokeAllSessions(resetToken.usuario.id);

  return { ...emptySuccess, message: "Contrasena restablecida." };
}
