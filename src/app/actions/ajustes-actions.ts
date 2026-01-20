"use server";

import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { comparePassword, hashPassword } from "../utils/password";

export type AjustesState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: AjustesState = { status: "success" };
const emptyError: AjustesState = { status: "error" };

export async function actualizarPerfil(
  _prevState: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "Debes iniciar sesion." };
  }

  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";

  if (!nombre || !email) {
    return { ...emptyError, message: "Nombre y email son obligatorios." };
  }

  const existente = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existente && existente.id !== session.user.id) {
    return { ...emptyError, message: "Ese email ya esta en uso." };
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { nombre, email },
  });

  revalidatePath("/dashboard/ajustes");
  return {
    ...emptySuccess,
    message: "Perfil actualizado. Inicia sesion de nuevo para ver cambios.",
  };
}

export async function actualizarPassword(
  _prevState: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "Debes iniciar sesion." };
  }

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ...emptyError, message: "Completa todos los campos." };
  }

  if (newPassword.length < 8) {
    return { ...emptyError, message: "La nueva contrasena debe tener 8 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { ...emptyError, message: "Las contrasenas no coinciden." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!usuario || !usuario.password) {
    return { ...emptyError, message: "No se pudo validar la cuenta." };
  }

  const isValid = await comparePassword(currentPassword, usuario.password);
  if (!isValid) {
    return { ...emptyError, message: "Contrasena actual incorrecta." };
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  revalidatePath("/dashboard/ajustes");
  return { ...emptySuccess, message: "Contrasena actualizada." };
}
