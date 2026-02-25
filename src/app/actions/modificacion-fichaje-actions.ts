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

const parseDateTime = (
  value?: string | null,
  tzOffsetMinutes?: number | null,
) => {
  if (!value) return null;
  const raw = value.toString().trim();
  if (!raw) return null;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw);

  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    if (typeof tzOffsetMinutes === "number" && !Number.isNaN(tzOffsetMinutes)) {
      const utcMs =
        Date.UTC(
          Number(y),
          Number(m) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          Number(ss ?? "0"),
        ) +
        tzOffsetMinutes * 60_000;
      return new Date(utcMs);
    }
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeText = (value?: string | null) => value?.toString().trim() ?? "";

const isInvalidRange = (entrada: Date | null, salida: Date | null) =>
  Boolean(entrada && salida && salida.getTime() <= entrada.getTime());

const hasOverlap = async (
  usuarioId: string,
  entrada: Date | null,
  salida: Date | null,
  excludeId?: string | null,
) => {
  if (!entrada) return false;

  const excludeClause = excludeId ? { not: excludeId } : undefined;
  const baseWhere = {
    usuarioId,
    tipo: "JORNADA" as const,
    ...(excludeClause ? { id: excludeClause } : {}),
  };

  if (!salida) {
    const open = await prisma.fichaje.findFirst({
      where: {
        ...baseWhere,
        salida: null,
      },
      select: { id: true },
    });
    return Boolean(open);
  }

  const overlap = await prisma.fichaje.findFirst({
    where: {
      ...baseWhere,
      OR: [
        { salida: null, entrada: { lt: salida } },
        { entrada: { lt: salida }, salida: { gt: entrada } },
      ],
    },
    select: { id: true },
  });

  return Boolean(overlap);
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
  const tzOffsetValue = formData.get("tzOffset")?.toString() ?? "";
  const tzOffsetMinutes =
    tzOffsetValue === "" ? null : Number(tzOffsetValue);
  const motivo = normalizeText(formData.get("motivo")?.toString() ?? "");

  if (!empleadoId) {
    return { ...emptyError, message: "Selecciona un empleado." };
  }

  const entradaPropuesta = parseDateTime(entradaValue, tzOffsetMinutes);
  const salidaPropuesta = parseDateTime(salidaValue, tzOffsetMinutes);

  if (!entradaPropuesta && !salidaPropuesta) {
    return { ...emptyError, message: "Indica al menos una hora." };
  }

  if (isInvalidRange(entradaPropuesta, salidaPropuesta)) {
    return { ...emptyError, message: "La salida debe ser posterior a la entrada." };
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
      fichaje: { select: { id: true, usuarioId: true, entrada: true, salida: true } },
    },
  });

  if (!solicitud || solicitud.empleadoId !== session.user.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const fichajeActual = solicitud.fichaje
    ? {
        entrada: solicitud.fichaje.entrada,
        salida: solicitud.fichaje.salida,
      }
    : null;

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
    const entradaFinal = entradaPropuesta ?? fichajeActual?.entrada ?? null;
    const salidaFinal = salidaPropuesta ?? fichajeActual?.salida ?? null;

    if (!entradaFinal) {
      return { ...emptyError, message: "Entrada requerida para actualizar fichaje." };
    }

    if (isInvalidRange(entradaFinal, salidaFinal)) {
      return { ...emptyError, message: "La salida debe ser posterior a la entrada." };
    }

    if (await hasOverlap(session.user.id, entradaFinal, salidaFinal, solicitud.fichajeId)) {
      return { ...emptyError, message: "El rango se solapa con otro fichaje." };
    }

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

    if (isInvalidRange(entradaPropuesta, salidaPropuesta)) {
      return { ...emptyError, message: "La salida debe ser posterior a la entrada." };
    }

    if (await hasOverlap(session.user.id, entradaPropuesta, salidaPropuesta, null)) {
      return { ...emptyError, message: "El rango se solapa con otro fichaje." };
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
