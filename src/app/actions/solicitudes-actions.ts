"use server";

import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import {
  createSignedUrl,
  deleteJustificante,
} from "../lib/supabase-storage";

export type SolicitudState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: SolicitudState = { status: "success" };
const emptyError: SolicitudState = { status: "error" };

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const logJustificanteAcceso = async (
  solicitudId: string,
  usuarioId: string,
  accion: "VER" | "BORRAR",
) => {
  try {
    await prisma.justificanteAcceso.create({
      data: {
        solicitudId,
        usuarioId,
        accion,
      },
    });
  } catch (error) {
    console.error("Error registrando acceso a justificante:", error);
  }
};

export async function solicitarVacaciones(
  _prevState: SolicitudState,
  formData: FormData,
): Promise<SolicitudState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "Debes iniciar sesion." };
  }

  const inicioValue = formData.get("inicio")?.toString() ?? "";
  const finValue = formData.get("fin")?.toString() ?? "";
  const motivo = formData.get("motivo")?.toString() ?? "";

  const inicio = parseDate(inicioValue);
  const fin = parseDate(finValue) ?? inicio;

  if (!inicio) {
    return { ...emptyError, message: "Selecciona una fecha de inicio." };
  }

  if (!fin) {
    return { ...emptyError, message: "Selecciona una fecha valida." };
  }

  if (fin.getTime() < inicio.getTime()) {
    return { ...emptyError, message: "La fecha de fin no puede ser menor." };
  }

  try {
    await prisma.solicitud.create({
      data: {
        usuarioId: session.user.id,
        tipo: "VACACIONES",
        inicio,
        fin,
        motivo: motivo || null,
      },
    });
  } catch (error) {
    console.error("Error al solicitar vacaciones:", error);
    return { ...emptyError, message: "No se pudo enviar la solicitud." };
  }

  revalidatePath("/dashboard/calendario");
  return { ...emptySuccess, message: "Solicitud enviada." };
}

export async function notificarAusencia(
  _prevState: SolicitudState,
  formData: FormData,
): Promise<SolicitudState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "Debes iniciar sesion." };
  }

  const inicioValue = formData.get("inicio")?.toString() ?? "";
  const finValue = formData.get("fin")?.toString() ?? "";
  const motivo = formData.get("motivo")?.toString() ?? "";
  const ausenciaTipoRaw = formData.get("ausenciaTipo")?.toString() ?? "";
  const ausenciaTipo =
    ausenciaTipoRaw === "FALTA" || ausenciaTipoRaw === "AVISO"
      ? (ausenciaTipoRaw as "FALTA" | "AVISO")
      : null;

  const inicio = parseDate(inicioValue);
  const fin = parseDate(finValue) ?? inicio;

  if (!inicio) {
    return { ...emptyError, message: "Selecciona una fecha de inicio." };
  }

  if (!fin) {
    return { ...emptyError, message: "Selecciona una fecha valida." };
  }

  if (fin.getTime() < inicio.getTime()) {
    return { ...emptyError, message: "La fecha de fin no puede ser menor." };
  }

  if (!ausenciaTipo) {
    return {
      ...emptyError,
      message: "Selecciona si has faltado o si vas a faltar.",
    };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (ausenciaTipo === "FALTA" && inicio.getTime() > today.getTime()) {
      return {
        ...emptyError,
        message: "La fecha de inicio no puede ser futura si ya has faltado.",
      };
    }

    if (ausenciaTipo === "AVISO" && inicio.getTime() < today.getTime()) {
      return {
        ...emptyError,
        message: "La fecha de inicio no puede ser pasada si vas a faltar.",
      };
    }

    await prisma.solicitud.create({
      data: {
        usuarioId: session.user.id,
        tipo: "AUSENCIA",
        inicio,
        fin,
        motivo: motivo || null,
        ausenciaTipo,
      },
    });
  } catch (error) {
    console.error("Error al notificar ausencia:", error);
    return { ...emptyError, message: "No se pudo enviar la ausencia." };
  }

  revalidatePath("/dashboard/calendario");
  return { ...emptySuccess, message: "Ausencia enviada." };
}

export async function obtenerUrlJustificante(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const solicitudId = formData.get("id")?.toString() ?? "";
  if (!solicitudId) {
    throw new Error("Solicitud invalida");
  }

  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: {
      usuario: { select: { id: true, empresaId: true } },
    },
  });

  if (!solicitud || !solicitud.justificanteRuta) {
    throw new Error("No hay justificante");
  }

  const role = session.user?.role ?? "";

  if (role === "EMPLEADO" && solicitud.usuario.id !== session.user.id) {
    throw new Error("No autorizado");
  }

  if (role === "GERENTE") {
    const gerente = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { empresaId: true },
    });

    if (!gerente || gerente.empresaId !== solicitud.usuario.empresaId) {
      throw new Error("No autorizado");
    }
  }

  if (role !== "ADMIN_SISTEMA" && role !== "GERENTE" && role !== "EMPLEADO") {
    throw new Error("No autorizado");
  }

  const url = await createSignedUrl(solicitud.justificanteRuta, 300);
  await logJustificanteAcceso(solicitud.id, session.user.id, "VER");
  return { url };
}

export async function actualizarSolicitud(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const solicitudId = formData.get("id")?.toString() ?? "";
  const estado = formData.get("estado")?.toString() ?? "";

  if (!solicitudId) {
    return;
  }

  if (estado !== "APROBADA" && estado !== "RECHAZADA" && estado !== "ANULADA") {
    return;
  }

  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: { usuario: { select: { empresaId: true } } },
  });

  if (!solicitud) {
    return;
  }

  const role = session.user?.role ?? "";

  if (role === "GERENTE") {
    const gerente = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { empresaId: true },
    });

    if (!gerente || gerente.empresaId !== solicitud.usuario.empresaId) {
      throw new Error("No autorizado");
    }
  } else if (role !== "ADMIN_SISTEMA") {
    throw new Error("No autorizado");
  }

  if (estado === "ANULADA" && solicitud.estado !== "APROBADA") {
    return;
  }

  await prisma.solicitud.update({
    where: { id: solicitudId },
    data: { estado },
  });

  revalidatePath("/dashboard/vacaciones-ausencias");
  revalidatePath("/dashboard/calendario");
}

export async function eliminarJustificante(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const solicitudId = formData.get("id")?.toString() ?? "";

  if (!solicitudId) {
    return;
  }

  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: { usuario: { select: { empresaId: true } } },
  });

  if (!solicitud || !solicitud.justificanteRuta) {
    return;
  }

  const role = session.user?.role ?? "";

  if (role === "GERENTE") {
    const gerente = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { empresaId: true },
    });

    if (!gerente || gerente.empresaId !== solicitud.usuario.empresaId) {
      throw new Error("No autorizado");
    }
  } else if (role !== "ADMIN_SISTEMA") {
    throw new Error("No autorizado");
  }

  await deleteJustificante(solicitud.justificanteRuta);
  await prisma.solicitud.update({
    where: { id: solicitudId },
    data: {
      justificanteNombre: null,
      justificanteRuta: null,
      justificanteMime: null,
      justificanteSize: null,
    },
  });

  await logJustificanteAcceso(solicitud.id, session.user.id, "BORRAR");
  revalidatePath("/dashboard/vacaciones-ausencias");
}
