"use server";

import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";
import { modificacionFichajeService } from "../../services/modificacion-fichaje";
import {
  sanitizeFormDataId,
  sanitizeFormDataString,
  sanitizeString,
} from "../utils/input";

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

const normalizeText = (value?: string | null) =>
  sanitizeString(value, { allowNewlines: true });

const isInvalidRange = (entrada: Date | null, salida: Date | null) =>
  Boolean(entrada && salida && salida.getTime() <= entrada.getTime());

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

  const empleadoId = sanitizeFormDataId(formData, "empleadoId");
  const fichajeId = sanitizeFormDataId(formData, "fichajeId");
  const entradaValue = sanitizeFormDataString(formData, "entrada", {
    maxLength: 32,
  });
  const salidaValue = sanitizeFormDataString(formData, "salida", {
    maxLength: 32,
  });
  const tzOffsetValue = sanitizeFormDataString(formData, "tzOffset", {
    maxLength: 8,
  });
  const tzOffsetMinutes =
    tzOffsetValue === "" ? null : Number(tzOffsetValue);
  const motivo = normalizeText(sanitizeFormDataString(formData, "motivo"));

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

  const result = await modificacionFichajeService.create(session.user.id, role, {
    empleadoId,
    fichajeId: fichajeId || null,
    entradaPropuesta,
    salidaPropuesta,
    motivo: motivo || null,
  });

  switch (result.outcome) {
    case "ok":
      revalidatePath("/dashboard/modificacion-fichajes");
      return { ...emptySuccess, message: "Solicitud enviada." };
    case "invalid-employee":
      return { ...emptyError, message: "Empleado invalido." };
    case "employee-out-of-scope":
      return { ...emptyError, message: "Empleado fuera de tu empresa." };
    case "invalid-fichaje":
      return { ...emptyError, message: "Fichaje invalido." };
  }
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

  const solicitudId = sanitizeFormDataId(formData, "id");
  const accion = sanitizeFormDataString(formData, "accion");

  if (!solicitudId || (accion !== "ACEPTADA" && accion !== "RECHAZADA")) {
    return { ...emptyError, message: "Solicitud invalida." };
  }

  const result = await modificacionFichajeService.respond(session.user.id, solicitudId, accion);

  switch (result.outcome) {
    case "ok":
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/modificacion-fichajes");
      return {
        ...emptySuccess,
        message: accion === "RECHAZADA" ? "Solicitud rechazada." : "Solicitud aplicada.",
      };
    case "not-found":
      return { ...emptyError, message: "No autorizado." };
    case "already-responded":
      return { ...emptyError, message: "Solicitud ya respondida." };
    case "no-hours-proposed":
      return { ...emptyError, message: "No hay horas propuestas." };
    case "entrada-required-for-update":
      return { ...emptyError, message: "Entrada requerida para actualizar fichaje." };
    case "entrada-required-for-create":
      return { ...emptyError, message: "Entrada requerida para crear fichaje." };
    case "invalid-range":
      return { ...emptyError, message: "La salida debe ser posterior a la entrada." };
    case "overlap":
      return { ...emptyError, message: "El rango se solapa con otro fichaje." };
  }
}
