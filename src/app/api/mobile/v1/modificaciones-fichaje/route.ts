import { NextResponse } from "next/server";
import { modificacionFichajeService } from "../../../../../services/modificacion-fichaje";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import type { ApiErrorResponse, ListModificacionesFichajeResponse, SolicitudModificacionFichajeDto } from "@gestor-rrhh/shared";

const LIST_LIMIT = 30;
const LIST_WINDOW_SECONDS = 60;

const unauthorized = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "unauthorized", message: "Token de acceso inválido o ausente." } },
    { status: 401 },
  );

const passwordChangeRequired = () =>
  NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code: "password_change_required",
        message: "Debes cambiar tu contraseña antes de continuar. Hazlo desde la aplicación web.",
      },
    },
    { status: 403 },
  );

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

function toDto(
  entry: Awaited<ReturnType<typeof modificacionFichajeService.listPending>>[number],
): SolicitudModificacionFichajeDto {
  return {
    id: entry.id,
    solicitanteNombre: entry.solicitanteNombre,
    solicitanteEmail: entry.solicitanteEmail,
    fichajeEntrada: entry.fichajeEntrada ? entry.fichajeEntrada.toISOString() : null,
    fichajeSalida: entry.fichajeSalida ? entry.fichajeSalida.toISOString() : null,
    entradaPropuesta: entry.entradaPropuesta ? entry.entradaPropuesta.toISOString() : null,
    salidaPropuesta: entry.salidaPropuesta ? entry.salidaPropuesta.toISOString() : null,
    motivo: entry.motivo,
    createdAt: entry.createdAt.toISOString(),
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

// Igual que la web (dashboard/page.tsx): solo tiene sentido para EMPLEADO
// (es quien recibe propuestas de corrección de su gerente/admin).
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "EMPLEADO") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `modificaciones-fichaje:list:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const solicitudes = await modificacionFichajeService.listPending(auth.context.userId);
    return NextResponse.json<ListModificacionesFichajeResponse>({ solicitudes: solicitudes.map(toDto) });
  } catch (error) {
    console.error("[GET /api/mobile/v1/modificaciones-fichaje]", error);
    return serverError();
  }
});
