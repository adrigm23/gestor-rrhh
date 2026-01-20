"use server";

import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

const getEmpresaId = async (userId: string) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { empresaId: true },
  });
  return usuario?.empresaId ?? null;
};

export async function crearCentroTrabajo(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id || session.user?.role === "EMPLEADO") {
    throw new Error("No autorizado");
  }

  const nombre = formData.get("nombre") as string;
  const gerenteId = (formData.get("gerenteId") as string) || null;
  const empresaIdFromForm = (formData.get("empresaId") as string) || null;

  if (!nombre) return;

  const empresaId =
    session.user.role === "ADMIN_SISTEMA"
      ? empresaIdFromForm
      : await getEmpresaId(session.user.id);

  if (!empresaId) return;

  if (gerenteId) {
    const gerente = await prisma.usuario.findUnique({
      where: { id: gerenteId },
      select: { rol: true, empresaId: true },
    });

    if (!gerente || gerente.rol !== "GERENTE" || gerente.empresaId !== empresaId) {
      throw new Error("Gerente invalido");
    }
  }

  await prisma.centroTrabajo.create({
    data: {
      nombre,
      empresaId,
      gerenteId,
    },
  });

  revalidatePath("/dashboard/centros-trabajo");
}

export async function crearDepartamento(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id || session.user?.role === "EMPLEADO") {
    throw new Error("No autorizado");
  }

  const nombre = formData.get("nombre") as string;
  const gerenteId = (formData.get("gerenteId") as string) || null;
  const centroTrabajoId = (formData.get("centroTrabajoId") as string) || null;
  const empresaIdFromForm = (formData.get("empresaId") as string) || null;

  if (!nombre) return;

  const empresaId =
    session.user.role === "ADMIN_SISTEMA"
      ? empresaIdFromForm
      : await getEmpresaId(session.user.id);

  if (!empresaId) return;

  if (gerenteId) {
    const gerente = await prisma.usuario.findUnique({
      where: { id: gerenteId },
      select: { rol: true, empresaId: true },
    });

    if (!gerente || gerente.rol !== "GERENTE" || gerente.empresaId !== empresaId) {
      throw new Error("Gerente invalido");
    }
  }

  if (centroTrabajoId) {
    const centro = await prisma.centroTrabajo.findUnique({
      where: { id: centroTrabajoId },
      select: { empresaId: true },
    });

    if (!centro || centro.empresaId !== empresaId) {
      throw new Error("Centro de trabajo invalido");
    }
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
}
