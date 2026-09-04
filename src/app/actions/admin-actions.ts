// src/app/actions/admin-actions.ts
"use server";

import { prisma } from "../lib/prisma";
import { hashNfcUid, sanitizeNfcUid } from "../utils/nfc";
import {
  sanitizeFormDataEmail,
  sanitizeFormDataId,
  sanitizeFormDataString,
} from "../utils/input";
import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";
import { usuarioService } from "../../services/usuario";

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

export type EliminarUsuarioState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type EstadoUsuarioState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type UpdateEmailState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type UpdateDniState = {
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
const emptyDeleteSuccess: EliminarUsuarioState = { status: "success" };
const emptyDeleteError: EliminarUsuarioState = { status: "error" };
const emptyEstadoSuccess: EstadoUsuarioState = { status: "success" };
const emptyEstadoError: EstadoUsuarioState = { status: "error" };
const emptyUpdateSuccess: UpdateEmailState = { status: "success" };
const emptyUpdateError: UpdateEmailState = { status: "error" };
const emptyUpdateDniSuccess: UpdateDniState = { status: "success" };
const emptyUpdateDniError: UpdateDniState = { status: "error" };

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeNombre = (value: string) => value.trim().replace(/\s+/g, " ");
const normalizeDni = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[-\s]/g, "");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dniRegex = /^(\d{8}|[XYZ]\d{7})[A-Z]$/;
const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

const isValidDni = (dni: string) => {
  if (!dniRegex.test(dni)) return false;
  const prefix = dni[0];
  const numericPartRaw =
    prefix === "X"
      ? `0${dni.slice(1, 8)}`
      : prefix === "Y"
        ? `1${dni.slice(1, 8)}`
        : prefix === "Z"
          ? `2${dni.slice(1, 8)}`
          : dni.slice(0, 8);
  const number = Number.parseInt(numericPartRaw, 10);
  if (!Number.isFinite(number)) return false;
  const expectedLetter = DNI_LETTERS[number % 23];
  return expectedLetter === dni.slice(-1);
};

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

  const nombre = normalizeNombre(
    sanitizeFormDataString(formData, "nombre", { collapseWhitespace: true }),
  );
  const dni = normalizeDni(sanitizeFormDataString(formData, "dni"));
  const email = normalizeEmail(sanitizeFormDataEmail(formData, "email"));
  const password = sanitizeFormDataString(formData, "password", {
    trim: false,
    maxLength: 256,
  });
  const nfcUidRaw = sanitizeFormDataString(formData, "nfcUid");
  const departamentoId = sanitizeFormDataId(formData, "departamentoId") || null;
  const empresaIdForm = sanitizeFormDataId(formData, "empresaId") || null;
  const rolRaw = sanitizeFormDataString(formData, "rol").toUpperCase();
  const horasSemanalesRaw = sanitizeFormDataString(formData, "horasSemanales");

  if (!nombre || !dni || !email || !password) {
    return { ...emptyError, message: "Completa todos los campos obligatorios." };
  }

  if (!emailRegex.test(email)) {
    return { ...emptyError, message: "Email invalido." };
  }

  if (!isValidDni(dni)) {
    return { ...emptyError, message: "DNI/NIE invalido." };
  }

  if (password.length < 8) {
    return { ...emptyError, message: "La contrasena debe tener 8 caracteres." };
  }

  if (!empresaIdForm) {
    return { ...emptyError, message: "Empresa requerida." };
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
    const result = await usuarioService.crearUsuario({
      nombre,
      dni,
      email,
      password,
      rol,
      empresaId: empresaIdForm,
      departamentoId: rol === "EMPLEADO" ? departamentoId : null,
      horasSemanales: rol === "EMPLEADO" ? horasSemanales : null,
      nfcUid: nfcUidRaw || null,
    });

    switch (result.outcome) {
      case "ok":
        break;
      case "invalid-dni":
        return { ...emptyError, message: "DNI/NIE invalido." };
      case "email-taken":
        return { ...emptyError, message: "Ese email ya esta en uso." };
      case "dni-taken":
        return { ...emptyError, message: "Ese DNI/NIE ya esta en uso." };
      case "invalid-departamento":
        return { ...emptyError, message: "Departamento invalido." };
      case "invalid-nfc":
        return { ...emptyError, message: "UID de tarjeta invalido." };
      case "nfc-taken":
        return { ...emptyError, message: "Esa tarjeta ya esta asignada." };
    }
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

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const mode = sanitizeFormDataString(formData, "mode").toLowerCase() || "assign";
  const nfcUidRaw = sanitizeFormDataString(formData, "nfcUid");

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

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const empresaId = sanitizeFormDataId(formData, "empresaId");

  if (!usuarioId || !empresaId) {
    return { ...emptyChangeError, message: "Datos incompletos." };
  }

  const result = await usuarioService.cambiarEmpresaUsuario(usuarioId, empresaId);

  switch (result.outcome) {
    case "ok":
      break;
    case "not-found":
      return { ...emptyChangeError, message: "Usuario no encontrado." };
    case "forbidden-target":
      return { ...emptyChangeError, message: "No se permite en este usuario." };
    case "invalid-empresa":
      return { ...emptyChangeError, message: "Empresa invalida." };
  }

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

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const horasRaw = sanitizeFormDataString(formData, "horasSemanales");
  const fechaInicioRaw = sanitizeFormDataString(formData, "fechaInicio");

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

  try {
    const result = await usuarioService.crearContrato(session.user.id, creador.rol, {
      empleadoId: usuarioId,
      horasSemanales,
      fechaInicio,
    });

    switch (result.outcome) {
      case "ok":
        break;
      case "invalid-employee":
        return { ...emptyContratoError, message: "Empleado invalido." };
      case "employee-out-of-scope":
        return { ...emptyContratoError, message: "Empleado fuera de tu empresa." };
      case "invalid-start-date":
        return { ...emptyContratoError, message: result.message };
    }
  } catch (error) {
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

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const password = sanitizeFormDataString(formData, "password", {
    trim: false,
    maxLength: 256,
  });

  if (!usuarioId || !password) {
    return { ...emptyResetError, message: "Completa todos los campos." };
  }

  if (password.length < 8) {
    return {
      ...emptyResetError,
      message: "La contrasena debe tener 8 caracteres.",
    };
  }

  const result = await usuarioService.resetPassword(usuarioId, password);

  switch (result.outcome) {
    case "ok":
      break;
    case "not-found":
      return { ...emptyResetError, message: "Usuario no encontrado." };
    case "forbidden-target":
      return { ...emptyResetError, message: "No se permite en este usuario." };
  }

  revalidatePath("/dashboard/empleados");
  return { ...emptyResetSuccess, message: "Contrasena actualizada." };
}

export async function eliminarUsuario(
  _prevState: EliminarUsuarioState,
  formData: FormData,
): Promise<EliminarUsuarioState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyDeleteError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyDeleteError, message: "No autorizado." };
  }

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  if (!usuarioId) {
    return { ...emptyDeleteError, message: "Usuario invalido." };
  }

  const result = await usuarioService.eliminarUsuario(usuarioId, session.user.id);

  switch (result.outcome) {
    case "ok":
      break;
    case "self":
      return { ...emptyDeleteError, message: "No puedes eliminar tu propia cuenta." };
    case "not-found":
      return { ...emptyDeleteError, message: "Usuario no encontrado." };
    case "forbidden-target":
      return { ...emptyDeleteError, message: "No se permite eliminar administradores." };
    case "has-blockers":
      return {
        ...emptyDeleteError,
        message: `No se puede eliminar: el usuario tiene ${result.blockers.join(", ")} asociados.`,
      };
  }

  revalidatePath("/dashboard/empleados");
  return { ...emptyDeleteSuccess, message: "Usuario eliminado." };
}

export async function actualizarEstadoUsuario(
  _prevState: EstadoUsuarioState,
  formData: FormData,
): Promise<EstadoUsuarioState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyEstadoError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyEstadoError, message: "No autorizado." };
  }

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const accion = sanitizeFormDataString(formData, "accion");

  if (!usuarioId) {
    return { ...emptyEstadoError, message: "Usuario invalido." };
  }

  if (accion !== "baja" && accion !== "reactivar") {
    return { ...emptyEstadoError, message: "Accion invalida." };
  }

  const result = await usuarioService.updateEstado(usuarioId, session.user.id, accion);

  switch (result.outcome) {
    case "ok":
      revalidatePath("/dashboard/empleados");
      return {
        ...emptyEstadoSuccess,
        message: accion === "baja" ? "Usuario dado de baja." : "Usuario reactivado.",
      };
    case "self":
      return { ...emptyEstadoError, message: "No puedes dar de baja tu cuenta." };
    case "not-found":
      return { ...emptyEstadoError, message: "Usuario no encontrado." };
    case "forbidden-target":
      return { ...emptyEstadoError, message: "No se permite en este usuario." };
    case "already-in-state":
      return {
        ...emptyEstadoError,
        message: accion === "baja" ? "El usuario ya esta dado de baja." : "El usuario ya esta activo.",
      };
  }
}

export async function actualizarEmailUsuario(
  _prevState: UpdateEmailState,
  formData: FormData,
): Promise<UpdateEmailState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyUpdateError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyUpdateError, message: "No autorizado." };
  }

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const email = normalizeEmail(sanitizeFormDataEmail(formData, "email"));

  if (!usuarioId || !email) {
    return { ...emptyUpdateError, message: "Completa todos los campos." };
  }

  if (!emailRegex.test(email)) {
    return { ...emptyUpdateError, message: "Email invalido." };
  }

  const result = await usuarioService.updateEmailAdmin(usuarioId, email);

  switch (result.outcome) {
    case "ok":
      break;
    case "not-found":
      return { ...emptyUpdateError, message: "Usuario no encontrado." };
    case "forbidden-target":
      return { ...emptyUpdateError, message: "No se permite en este usuario." };
    case "email-taken":
      return { ...emptyUpdateError, message: "Ese email ya esta en uso." };
  }

  revalidatePath("/dashboard/empleados");
  return { ...emptyUpdateSuccess, message: "Email actualizado." };
}

export async function actualizarDniUsuario(
  _prevState: UpdateDniState,
  formData: FormData,
): Promise<UpdateDniState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyUpdateDniError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyUpdateDniError, message: "No autorizado." };
  }

  const usuarioId = sanitizeFormDataId(formData, "usuarioId");
  const dni = normalizeDni(sanitizeFormDataString(formData, "dni"));

  if (!usuarioId || !dni) {
    return { ...emptyUpdateDniError, message: "Completa todos los campos." };
  }

  if (!isValidDni(dni)) {
    return { ...emptyUpdateDniError, message: "DNI/NIE invalido." };
  }

  const result = await usuarioService.updateDniAdmin(usuarioId, dni);

  switch (result.outcome) {
    case "ok":
      break;
    case "invalid-dni":
      return { ...emptyUpdateDniError, message: "DNI/NIE invalido." };
    case "not-found":
      return { ...emptyUpdateDniError, message: "Usuario no encontrado." };
    case "forbidden-target":
      return { ...emptyUpdateDniError, message: "No se permite en este usuario." };
    case "dni-taken":
      return { ...emptyUpdateDniError, message: "Ese DNI/NIE ya esta en uso." };
  }

  revalidatePath("/dashboard/empleados");
  return { ...emptyUpdateDniSuccess, message: "DNI actualizado." };
}
