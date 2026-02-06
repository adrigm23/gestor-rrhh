"use server";

import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

export type EmpresaState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type EliminarEmpresaState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: EmpresaState = { status: "success" };
const emptyError: EmpresaState = { status: "error" };
const emptyDeleteSuccess: EliminarEmpresaState = { status: "success" };
const emptyDeleteError: EliminarEmpresaState = { status: "error" };

const normalizeNombre = (value?: string | null) =>
  value?.toString().trim().replace(/\s+/g, " ") ?? "";

const normalizeCif = (value?: string | null) =>
  value?.toString().trim().toUpperCase() ?? "";

const allowedPlans = new Set(["FREE", "PRO", "ENTERPRISE"]);

export async function crearEmpresa(
  _prevState: EmpresaState,
  formData: FormData,
): Promise<EmpresaState> {
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

  const nombre = normalizeNombre(formData.get("nombre") as string);
  const cif = normalizeCif(formData.get("cif") as string);
  const planRaw = formData.get("plan")?.toString().trim().toUpperCase() ?? "FREE";

  if (!nombre || !cif) {
    return { ...emptyError, message: "Nombre y CIF son obligatorios." };
  }

  if (cif.length < 6) {
    return { ...emptyError, message: "CIF invalido." };
  }

  const plan = allowedPlans.has(planRaw) ? planRaw : "FREE";

  const existente = await prisma.empresa.findFirst({
    where: {
      OR: [
        { cif },
        { nombre: { equals: nombre, mode: "insensitive" } },
      ],
    },
    select: { id: true, cif: true, nombre: true },
  });

  if (existente) {
    if (existente.cif === cif) {
      return { ...emptyError, message: "Ese CIF ya esta registrado." };
    }
    return { ...emptyError, message: "Ya existe una empresa con ese nombre." };
  }

  try {
    await prisma.empresa.create({
      data: {
        nombre,
        cif,
        plan,
      },
    });
  } catch (error) {
    console.error("Error al crear empresa:", error);
    return { ...emptyError, message: "No se pudo crear la empresa." };
  }

  revalidatePath("/dashboard/empresas");
  revalidatePath("/dashboard/centros-trabajo");
  revalidatePath("/dashboard/departamentos");
  revalidatePath("/dashboard/empleados");
  return { ...emptySuccess, message: "Empresa creada correctamente." };
}

export async function eliminarEmpresa(
  _prevState: EliminarEmpresaState,
  formData: FormData,
): Promise<EliminarEmpresaState> {
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

  const empresaId = formData.get("empresaId")?.toString().trim() ?? "";

  if (!empresaId) {
    return { ...emptyDeleteError, message: "Empresa invalida." };
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      _count: {
        select: { usuarios: true, departamentos: true, centrosTrabajo: true },
      },
    },
  });

  if (!empresa) {
    return { ...emptyDeleteError, message: "Empresa no encontrada." };
  }

  if (
    empresa._count.usuarios > 0 ||
    empresa._count.departamentos > 0 ||
    empresa._count.centrosTrabajo > 0
  ) {
    return {
      ...emptyDeleteError,
      message:
        "No se puede eliminar: hay usuarios, departamentos o centros asociados.",
    };
  }

  try {
    await prisma.empresa.delete({ where: { id: empresaId } });
  } catch (error) {
    console.error("Error al eliminar empresa:", error);
    return { ...emptyDeleteError, message: "No se pudo eliminar la empresa." };
  }

  revalidatePath("/dashboard/empresas");
  revalidatePath("/dashboard/centros-trabajo");
  revalidatePath("/dashboard/departamentos");
  revalidatePath("/dashboard/empleados");
  return { ...emptyDeleteSuccess, message: "Empresa eliminada." };
}
