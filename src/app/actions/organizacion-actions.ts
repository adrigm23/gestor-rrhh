"use server";

import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

export type OrganizacionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: OrganizacionState = { status: "success" };
const emptyError: OrganizacionState = { status: "error" };

const normalizeNombre = (value?: string | null) =>
  value?.toString().trim().replace(/\s+/g, " ") ?? "";

const normalizeDireccion = (value?: string | null) =>
  value?.toString().trim().replace(/\s+/g, " ") ?? "";

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
    select: { rol: true, empresaId: true },
  });

  if (!actor || actor.rol === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const nombre = normalizeNombre(formData.get("nombre") as string);
  const gerenteId = (formData.get("gerenteId") as string) || null;
  const direccion = normalizeDireccion(formData.get("direccion") as string);
  const empresaIdFromForm = (formData.get("empresaId") as string) || null;

  if (!nombre) {
    return { ...emptyError, message: "Nombre requerido." };
  }

  const empresaId =
    actor.rol === "ADMIN_SISTEMA" ? empresaIdFromForm : actor.empresaId;

  if (!empresaId) {
    return { ...emptyError, message: "Empresa requerida." };
  }

  if (gerenteId) {
    const gerente = await prisma.usuario.findUnique({
      where: { id: gerenteId },
      select: { rol: true, empresaId: true },
    });

    if (!gerente || gerente.rol !== "GERENTE" || gerente.empresaId !== empresaId) {
      return { ...emptyError, message: "Gerente invalido." };
    }
  }

  const existente = await prisma.centroTrabajo.findFirst({
    where: {
      empresaId,
      nombre: { equals: nombre, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existente) {
    return { ...emptyError, message: "Ya existe un centro con ese nombre." };
  }

  await prisma.centroTrabajo.create({
    data: {
      nombre,
      empresaId,
      gerenteId,
      ...(direccion ? { direccion } : {}),
    },
  });

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
    select: { rol: true, empresaId: true },
  });

  if (!actor || actor.rol === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const nombre = normalizeNombre(formData.get("nombre") as string);
  const gerenteId = (formData.get("gerenteId") as string) || null;
  const centroTrabajoId = (formData.get("centroTrabajoId") as string) || null;
  const empresaIdFromForm = (formData.get("empresaId") as string) || null;

  if (!nombre) {
    return { ...emptyError, message: "Nombre requerido." };
  }

  const empresaId =
    actor.rol === "ADMIN_SISTEMA" ? empresaIdFromForm : actor.empresaId;

  if (!empresaId) {
    return { ...emptyError, message: "Empresa requerida." };
  }

  if (gerenteId) {
    const gerente = await prisma.usuario.findUnique({
      where: { id: gerenteId },
      select: { rol: true, empresaId: true },
    });

    if (!gerente || gerente.rol !== "GERENTE" || gerente.empresaId !== empresaId) {
      return { ...emptyError, message: "Gerente invalido." };
    }
  }

  if (centroTrabajoId) {
    const centro = await prisma.centroTrabajo.findUnique({
      where: { id: centroTrabajoId },
      select: { empresaId: true },
    });

    if (!centro || centro.empresaId !== empresaId) {
      return { ...emptyError, message: "Centro de trabajo invalido." };
    }
  }

  const existente = await prisma.departamento.findFirst({
    where: {
      empresaId,
      nombre: { equals: nombre, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existente) {
    return { ...emptyError, message: "Ya existe un departamento con ese nombre." };
  }

  await prisma.departamento.create({
    data: {
      nombre,
      empresaId,
      gerenteId,
      centroTrabajoId,
    },
  });

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
    select: { rol: true, empresaId: true },
  });

  if (!actor || actor.rol === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const centroId = formData.get("centroId")?.toString().trim() ?? "";
  const direccion = normalizeDireccion(formData.get("direccion") as string);

  if (!centroId) {
    return { ...emptyError, message: "Centro invalido." };
  }

  const centro = await prisma.centroTrabajo.findUnique({
    where: { id: centroId },
    select: { empresaId: true },
  });

  if (!centro) {
    return { ...emptyError, message: "Centro no encontrado." };
  }

  if (actor.rol === "GERENTE" && actor.empresaId !== centro.empresaId) {
    return { ...emptyError, message: "Centro fuera de tu empresa." };
  }

  await prisma.centroTrabajo.update({
    where: { id: centroId },
    data: { direccion: direccion || null },
  });

  revalidatePath("/dashboard/centros-trabajo");
  return { ...emptySuccess, message: "Direccion actualizada." };
}
