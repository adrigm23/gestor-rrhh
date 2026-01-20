"use server";

import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";

export type ModificacionFichajeState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: ModificacionFichajeState = { status: "success" };
const emptyError: ModificacionFichajeState = { status: "error" };

const parseDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getEmpresaId = async (userId: string) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { empresaId: true },
  });
  return usuario?.empresaId ?? null;
};

export async function crearSolicitudModificacion(
  _prevState: ModificacionFichajeState,
  formData: FormData,
): Promise<ModificacionFichajeState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "Debes iniciar sesion." };
  }

  const role = session.user?.role ?? "";

  if (role !== "GERENTE" && role !== "ADMIN_SISTEMA") {
    return { ...emptyError, message: "No autorizado." };
  }

  const empleadoId = formData.get("empleadoId")?.toString() ?? "";
  const fichajeId = formData.get("fichajeId")?.toString() ?? "";
  const entradaValue = formData.get("entrada")?.toString() ?? "";
  const salidaValue = formData.get("salida")?.toString() ?? "";
  const motivo = formData.get("motivo")?.toString() ?? "";

  if (!empleadoId) {
    return { ...emptyError, message: "Selecciona un empleado." };
  }

  const entradaPropuesta = parseDateTime(entradaValue);
  const salidaPropuesta = parseDateTime(salidaValue);

  if (!entradaPropuesta && !salidaPropuesta) {
    return { ...emptyError, message: "Indica al menos una hora." };
  }

  const empresaId =
    role === "ADMIN_SISTEMA"
      ? null
      : await getEmpresaId(session.user.id);

  const empleado = await prisma.usuario.findUnique({
    where: { id: empleadoId },
    select: { rol: true, empresaId: true },
  });

  if (!empleado || empleado.rol !== "EMPLEADO") {
    return { ...emptyError, message: "Empleado invalido." };
  }

  if (empresaId && empleado.empresaId !== empresaId) {
    return { ...emptyError, message: "Empleado fuera de tu empresa." };
  }

  let fichajeTargetId: string | null = null;

  if (fichajeId) {
    const fichaje = await prisma.fichaje.findUnique({
      where: { id: fichajeId },
      select: { id: true, usuarioId: true },
    });

    if (!fichaje || fichaje.usuarioId !== empleadoId) {
      return { ...emptyError, message: "Fichaje invalido." };
    }

    fichajeTargetId = fichaje.id;
  }

  await prisma.solicitudModificacionFichaje.create({
    data: {
      empleadoId,
      solicitanteId: session.user.id,
      fichajeId: fichajeTargetId,
      entradaPropuesta,
      salidaPropuesta,
      motivo: motivo || null,
    },
  });

  revalidatePath("/dashboard/modificacion-fichajes");
  return { ...emptySuccess, message: "Solicitud enviada." };
}

export async function responderSolicitudModificacion(
  _prevState: ModificacionFichajeState,
  formData: FormData,
): Promise<ModificacionFichajeState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "Debes iniciar sesion." };
  }

  if (session.user?.role !== "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const solicitudId = formData.get("id")?.toString() ?? "";
  const accion = formData.get("accion")?.toString() ?? "";

  if (!solicitudId || (accion !== "ACEPTADA" && accion !== "RECHAZADA")) {
    return { ...emptyError, message: "Solicitud invalida." };
  }

  const solicitud = await prisma.solicitudModificacionFichaje.findUnique({
    where: { id: solicitudId },
    include: {
      fichaje: { select: { id: true, usuarioId: true } },
    },
  });

  if (!solicitud || solicitud.empleadoId !== session.user.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  if (solicitud.estado !== "PENDIENTE") {
    return { ...emptyError, message: "Solicitud ya respondida." };
  }

  if (accion === "RECHAZADA") {
    await prisma.solicitudModificacionFichaje.update({
      where: { id: solicitud.id },
      data: {
        estado: "RECHAZADA",
        respondedAt: new Date(),
        respondidoPorId: session.user.id,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/modificacion-fichajes");
    return { ...emptySuccess, message: "Solicitud rechazada." };
  }

  const entradaPropuesta = solicitud.entradaPropuesta ?? null;
  const salidaPropuesta = solicitud.salidaPropuesta ?? null;

  if (!entradaPropuesta && !salidaPropuesta) {
    return { ...emptyError, message: "No hay horas propuestas." };
  }

  if (solicitud.fichajeId) {
    const updateData: {
      entrada?: Date;
      salida?: Date | null;
      editado?: boolean;
      motivoEdicion?: string | null;
      editadoPorId?: string | null;
    } = {
      editado: true,
      motivoEdicion: solicitud.motivo ?? null,
      editadoPorId: session.user.id,
    };

    if (entradaPropuesta) {
      updateData.entrada = entradaPropuesta;
    }

    if (salidaPropuesta) {
      updateData.salida = salidaPropuesta;
    }

    await prisma.fichaje.update({
      where: { id: solicitud.fichajeId },
      data: updateData,
    });
  } else {
    if (!entradaPropuesta) {
      return { ...emptyError, message: "Entrada requerida para crear fichaje." };
    }

    await prisma.fichaje.create({
      data: {
        usuarioId: session.user.id,
        entrada: entradaPropuesta,
        salida: salidaPropuesta,
        tipo: "JORNADA",
        editado: true,
        motivoEdicion: solicitud.motivo ?? null,
        editadoPorId: session.user.id,
      },
    });
  }

  await prisma.solicitudModificacionFichaje.update({
    where: { id: solicitud.id },
    data: {
      estado: "ACEPTADA",
      respondedAt: new Date(),
      respondidoPorId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/modificacion-fichajes");
  return { ...emptySuccess, message: "Solicitud aplicada." };
}
