// src/app/actions/admin-actions.ts
"use server";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { hashNfcUid, sanitizeNfcUid } from "../utils/nfc";
import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";

export type CrearUsuarioState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: CrearUsuarioState = { status: "success" };
const emptyError: CrearUsuarioState = { status: "error" };

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeNombre = (value: string) => value.trim().replace(/\s+/g, " ");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function crearUsuario(
  _prevState: CrearUsuarioState,
  formData: FormData,
): Promise<CrearUsuarioState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyError, message: "No autorizado." };
  }

  const nombre = normalizeNombre(formData.get("nombre")?.toString() ?? "");
  const email = normalizeEmail(formData.get("email")?.toString() ?? "");
  const password = formData.get("password")?.toString() ?? "";
  const nfcUidRaw = formData.get("nfcUid")?.toString() ?? "";
  const departamentoId = formData.get("departamentoId")?.toString().trim() || null;
  const empresaIdForm = formData.get("empresaId")?.toString().trim() || null;
  const rolRaw = formData.get("rol")?.toString().trim().toUpperCase() ?? "";

  if (!nombre || !email || !password) {
    return { ...emptyError, message: "Completa todos los campos obligatorios." };
  }

  if (!emailRegex.test(email)) {
    return { ...emptyError, message: "Email invalido." };
  }

  if (password.length < 8) {
    return { ...emptyError, message: "La contrasena debe tener 8 caracteres." };
  }

  if (!empresaIdForm) {
    return { ...emptyError, message: "Empresa requerida." };
  }

  const nfcUid = sanitizeNfcUid(nfcUidRaw);
  let nfcUidHash: string | null = null;
  if (nfcUid) {
    if (nfcUid.length < 4 || nfcUid.length > 32) {
      return { ...emptyError, message: "UID de tarjeta invalido." };
    }
    nfcUidHash = hashNfcUid(nfcUid);
    const existenteUid = await prisma.usuario.findFirst({
      where: { nfcUidHash },
      select: { id: true },
    });
    if (existenteUid) {
      return { ...emptyError, message: "Esa tarjeta ya esta asignada." };
    }
  }

  let rol: "EMPLEADO" | "GERENTE";
  if (rolRaw === "GERENTE") {
    rol = "GERENTE";
  } else if (rolRaw === "EMPLEADO") {
    rol = "EMPLEADO";
  } else {
    return { ...emptyError, message: "Rol invalido." };
  }

  try {
    const existente = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existente) {
      return { ...emptyError, message: "Ese email ya esta en uso." };
    }

    const hashedPassword = await hashPassword(password);
    const departamentoFinal = rol === "EMPLEADO" ? departamentoId : null;

    if (departamentoFinal) {
      const departamento = await prisma.departamento.findUnique({
        where: { id: departamentoFinal },
        select: { empresaId: true },
      });

      if (!departamento || departamento.empresaId !== empresaIdForm) {
        return { ...emptyError, message: "Departamento invalido." };
      }
    }

    await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol,
        empresaId: empresaIdForm,
        departamentoId: departamentoFinal,
        nfcUidHash,
      },
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return { ...emptyError, message: "No se pudo crear el usuario." };
  }

  revalidatePath("/dashboard/empleados");
  return { ...emptySuccess, message: "Usuario creado correctamente." };
}
