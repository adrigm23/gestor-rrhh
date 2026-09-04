"use server";

import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import {
  sanitizeFormDataId,
  sanitizeFormDataString,
  sanitizeString,
} from "../utils/input";
import { organizacionService } from "../../services/organizacion";

export type OrganizacionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: OrganizacionState = { status: "success" };
const emptyError: OrganizacionState = { status: "error" };

const normalizeNombre = (value?: string | null) =>
  sanitizeString(value, { collapseWhitespace: true });

const normalizeDireccion = (value?: string | null) =>
  sanitizeString(value, { collapseWhitespace: true });

export async function crearCentroTrabajo(
  _prevState: OrganizacionState,
  formData: FormData,
): Promise<OrganizacionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const actor = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!actor || actor.rol === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const nombre = normalizeNombre(sanitizeFormDataString(formData, "nombre"));
  const gerenteId = sanitizeFormDataId(formData, "gerenteId") || null;
  const direccion = normalizeDireccion(
    sanitizeFormDataString(formData, "direccion"),
  );
  const empresaIdFromForm = sanitizeFormDataId(formData, "empresaId") || null;

  if (!nombre) {
    return { ...emptyError, message: "Nombre requerido." };
  }

  const result = await organizacionService.crearCentroTrabajo(session.user.id, actor.rol, {
    nombre,
    gerenteId,
    direccion: direccion || null,
    empresaId: empresaIdFromForm,
  });

  switch (result.outcome) {
    case "ok":
      break;
    case "empresa-requerida":
      return { ...emptyError, message: "Empresa requerida." };
    case "gerente-invalido":
      return { ...emptyError, message: "Gerente invalido." };
    case "nombre-duplicado":
      return { ...emptyError, message: "Ya existe un centro con ese nombre." };
  }

  revalidatePath("/dashboard/centros-trabajo");
  return { ...emptySuccess, message: "Centro creado correctamente." };
}

export async function crearDepartamento(
  _prevState: OrganizacionState,
  formData: FormData,
): Promise<OrganizacionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const actor = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!actor || actor.rol === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const nombre = normalizeNombre(sanitizeFormDataString(formData, "nombre"));
  const gerenteId = sanitizeFormDataId(formData, "gerenteId") || null;
  const centroTrabajoId = sanitizeFormDataId(formData, "centroTrabajoId") || null;
  const empresaIdFromForm = sanitizeFormDataId(formData, "empresaId") || null;

  if (!nombre) {
    return { ...emptyError, message: "Nombre requerido." };
  }

  const result = await organizacionService.crearDepartamento(session.user.id, actor.rol, {
    nombre,
    gerenteId,
    centroTrabajoId,
    empresaId: empresaIdFromForm,
  });

  switch (result.outcome) {
    case "ok":
      break;
    case "empresa-requerida":
      return { ...emptyError, message: "Empresa requerida." };
    case "gerente-invalido":
      return { ...emptyError, message: "Gerente invalido." };
    case "centro-invalido":
      return { ...emptyError, message: "Centro de trabajo invalido." };
    case "nombre-duplicado":
      return { ...emptyError, message: "Ya existe un departamento con ese nombre." };
  }

  revalidatePath("/dashboard/departamentos");
  return { ...emptySuccess, message: "Departamento creado correctamente." };
}

export async function actualizarCentroTrabajoDireccion(
  _prevState: OrganizacionState,
  formData: FormData,
): Promise<OrganizacionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const actor = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!actor || actor.rol === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const centroId = sanitizeFormDataId(formData, "centroId");
  const direccion = normalizeDireccion(
    sanitizeFormDataString(formData, "direccion"),
  );

  if (!centroId) {
    return { ...emptyError, message: "Centro invalido." };
  }

  const result = await organizacionService.updateCentroDireccion(
    session.user.id,
    actor.rol,
    centroId,
    direccion || null,
  );

  switch (result.outcome) {
    case "ok":
      break;
    case "not-found":
      return { ...emptyError, message: "Centro no encontrado." };
    case "out-of-scope":
      return { ...emptyError, message: "Centro fuera de tu empresa." };
  }

  revalidatePath("/dashboard/centros-trabajo");
  revalidatePath("/dashboard");
  return { ...emptySuccess, message: "Direccion actualizada." };
}
