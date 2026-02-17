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

export type AsignarTarjetaState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type CambiarEmpresaState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type ContratoState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type ResetPasswordState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: CrearUsuarioState = { status: "success" };
const emptyError: CrearUsuarioState = { status: "error" };
const emptyAssignSuccess: AsignarTarjetaState = { status: "success" };
const emptyAssignError: AsignarTarjetaState = { status: "error" };
const emptyChangeSuccess: CambiarEmpresaState = { status: "success" };
const emptyChangeError: CambiarEmpresaState = { status: "error" };
const emptyContratoSuccess: ContratoState = { status: "success" };
const emptyContratoError: ContratoState = { status: "error" };
const emptyResetSuccess: ResetPasswordState = { status: "success" };
const emptyResetError: ResetPasswordState = { status: "error" };

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
  const horasSemanalesRaw = formData.get("horasSemanales")?.toString() ?? "";

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

  const horasSemanales = Number.parseFloat(
    horasSemanalesRaw.replace(",", "."),
  );
  if (rol === "EMPLEADO") {
    if (!Number.isFinite(horasSemanales) || horasSemanales <= 0) {
      return { ...emptyError, message: "Horas semanales invalidas." };
    }
    if (horasSemanales > 60) {
      return { ...emptyError, message: "Las horas semanales son demasiado altas." };
    }
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

    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
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

      if (rol === "EMPLEADO") {
        await tx.contrato.create({
          data: {
            usuarioId: usuario.id,
            horasSemanales,
            fechaInicio: new Date(),
          },
        });
      }
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return { ...emptyError, message: "No se pudo crear el usuario." };
  }

  revalidatePath("/dashboard/empleados");
  return { ...emptySuccess, message: "Usuario creado correctamente." };
}

export async function asignarTarjetaUsuario(
  _prevState: AsignarTarjetaState,
  formData: FormData,
): Promise<AsignarTarjetaState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyAssignError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyAssignError, message: "No autorizado." };
  }

  const usuarioId = formData.get("usuarioId")?.toString().trim() ?? "";
  const mode = formData.get("mode")?.toString() ?? "assign";
  const nfcUidRaw = formData.get("nfcUid")?.toString() ?? "";

  if (!usuarioId) {
    return { ...emptyAssignError, message: "Usuario invalido." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true },
  });

  if (!usuario) {
    return { ...emptyAssignError, message: "Usuario no encontrado." };
  }

  if (usuario.rol === "ADMIN_SISTEMA") {
    return { ...emptyAssignError, message: "No se permite en este usuario." };
  }

  if (mode === "clear") {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { nfcUidHash: null },
    });
    revalidatePath("/dashboard/empleados");
    return { ...emptyAssignSuccess, message: "Tarjeta desvinculada." };
  }

  const nfcUid = sanitizeNfcUid(nfcUidRaw);
  if (!nfcUid) {
    return { ...emptyAssignError, message: "Acerca la tarjeta al lector." };
  }

  if (nfcUid.length < 4 || nfcUid.length > 32) {
    return { ...emptyAssignError, message: "UID de tarjeta invalido." };
  }

  const nfcUidHash = hashNfcUid(nfcUid);
  const existenteUid = await prisma.usuario.findFirst({
    where: { nfcUidHash },
    select: { id: true },
  });

  if (existenteUid && existenteUid.id !== usuarioId) {
    return { ...emptyAssignError, message: "Esa tarjeta ya esta asignada." };
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { nfcUidHash },
  });

  revalidatePath("/dashboard/empleados");
  return { ...emptyAssignSuccess, message: "Tarjeta asociada." };
}

export async function cambiarEmpresaUsuario(
  _prevState: CambiarEmpresaState,
  formData: FormData,
): Promise<CambiarEmpresaState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyChangeError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyChangeError, message: "No autorizado." };
  }

  const usuarioId = formData.get("usuarioId")?.toString().trim() ?? "";
  const empresaId = formData.get("empresaId")?.toString().trim() ?? "";

  if (!usuarioId || !empresaId) {
    return { ...emptyChangeError, message: "Datos incompletos." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true, departamentoId: true, empresaId: true },
  });

  if (!usuario) {
    return { ...emptyChangeError, message: "Usuario no encontrado." };
  }

  if (usuario.rol === "ADMIN_SISTEMA") {
    return { ...emptyChangeError, message: "No se permite en este usuario." };
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { id: true },
  });

  if (!empresa) {
    return { ...emptyChangeError, message: "Empresa invalida." };
  }

  let departamentoId: string | null = usuario.departamentoId ?? null;
  if (departamentoId) {
    const departamento = await prisma.departamento.findUnique({
      where: { id: departamentoId },
      select: { empresaId: true },
    });
    if (!departamento || departamento.empresaId !== empresaId) {
      departamentoId = null;
    }
  }

  if (usuario.rol === "GERENTE") {
    await prisma.departamento.updateMany({
      where: { gerenteId: usuarioId, empresaId: { not: empresaId } },
      data: { gerenteId: null },
    });
    await prisma.centroTrabajo.updateMany({
      where: { gerenteId: usuarioId, empresaId: { not: empresaId } },
      data: { gerenteId: null },
    });
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      empresaId,
      departamentoId,
    },
  });

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/departamentos");
  revalidatePath("/dashboard/centros-trabajo");
  return { ...emptyChangeSuccess, message: "Empresa actualizada." };
}

const parseDateInput = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function crearContrato(
  _prevState: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyContratoError, message: "No autorizado." };
  }

  const usuarioId = formData.get("usuarioId")?.toString().trim() ?? "";
  const horasRaw = formData.get("horasSemanales")?.toString() ?? "";
  const fechaInicioRaw = formData.get("fechaInicio")?.toString() ?? "";

  if (!usuarioId) {
    return { ...emptyContratoError, message: "Empleado invalido." };
  }

  const horasSemanales = Number.parseFloat(horasRaw.replace(",", "."));
  if (!Number.isFinite(horasSemanales) || horasSemanales <= 0) {
    return { ...emptyContratoError, message: "Horas semanales invalidas." };
  }
  if (horasSemanales > 60) {
    return { ...emptyContratoError, message: "Las horas semanales son demasiado altas." };
  }

  const fechaInicio = parseDateInput(fechaInicioRaw) ?? new Date();

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true, empresaId: true },
  });

  if (!creador || (creador.rol !== "ADMIN_SISTEMA" && creador.rol !== "GERENTE")) {
    return { ...emptyContratoError, message: "No autorizado." };
  }

  const empleado = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true, empresaId: true },
  });

  if (!empleado || empleado.rol !== "EMPLEADO") {
    return { ...emptyContratoError, message: "Empleado invalido." };
  }

  if (creador.rol === "GERENTE" && creador.empresaId !== empleado.empresaId) {
    return { ...emptyContratoError, message: "Empleado fuera de tu empresa." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const contratoActivo = await tx.contrato.findFirst({
        where: { usuarioId, fechaFin: null },
        orderBy: { fechaInicio: "desc" },
      });

      if (contratoActivo) {
        if (fechaInicio.getTime() <= contratoActivo.fechaInicio.getTime()) {
          throw new Error("La fecha de inicio debe ser posterior al contrato activo.");
        }

        const fechaFin = new Date(fechaInicio.getTime() - 1);
        await tx.contrato.update({
          where: { id: contratoActivo.id },
          data: { fechaFin },
        });
      }

      await tx.contrato.create({
        data: {
          usuarioId,
          horasSemanales,
          fechaInicio,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "La fecha de inicio debe ser posterior al contrato activo."
    ) {
      return { ...emptyContratoError, message: error.message };
    }
    console.error("Error creando contrato:", error);
    return { ...emptyContratoError, message: "No se pudo crear el contrato." };
  }

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/escritorio");
  return { ...emptyContratoSuccess, message: "Contrato actualizado." };
}

export async function resetUsuarioPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyResetError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyResetError, message: "No autorizado." };
  }

  const usuarioId = formData.get("usuarioId")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!usuarioId || !password) {
    return { ...emptyResetError, message: "Completa todos los campos." };
  }

  if (password.length < 8) {
    return {
      ...emptyResetError,
      message: "La contrasena debe tener 8 caracteres.",
    };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true },
  });

  if (!usuario) {
    return { ...emptyResetError, message: "Usuario no encontrado." };
  }

  if (usuario.rol === "ADMIN_SISTEMA") {
    return { ...emptyResetError, message: "No se permite en este usuario." };
  }

  const hashedPassword = await hashPassword(password);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { password: hashedPassword },
  });

  revalidatePath("/dashboard/empleados");
  return { ...emptyResetSuccess, message: "Contrasena actualizada." };
}
