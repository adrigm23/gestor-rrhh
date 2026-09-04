import { NextResponse } from "next/server";
import { resumenHorasService } from "../../../../../services/resumen-horas";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import type { ApiErrorResponse, GetResumenHorasResponse, ResumenHorasDto } from "@gestor-rrhh/shared";

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

function toDto(data: Extract<Awaited<ReturnType<typeof resumenHorasService.getResumen>>, { outcome: "ok" }>["data"]): ResumenHorasDto {
  return {
    empleadoNombre: data.empleadoNombre,
    empleadoEmail: data.empleadoEmail,
    empresaNombre: data.empresaNombre,
    pausaCuentaComoTrabajo: data.pausaCuentaComoTrabajo,
    rangeStart: data.rangeStart.toISOString(),
    rangeEnd: data.rangeEnd.toISOString(),
    totalMs: data.totalMs,
    contratoHorasSemanales: data.contratoHorasSemanales,
    contratoDesde: data.contratoDesde ? data.contratoDesde.toISOString() : null,
    progresoPercent: data.progresoPercent,
    fichajes: data.fichajes.map((f) => ({
      id: f.id,
      entrada: f.entrada.toISOString(),
      salida: f.salida ? f.salida.toISOString() : null,
      tipo: f.tipo,
      durationMs: f.durationMs,
    })),
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

// Igual que escritorio/page.tsx: EMPLEADO y GERENTE, no ADMIN_SISTEMA.
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "EMPLEADO" && auth.context.role !== "GERENTE") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(`resumen-horas:${auth.context.userId}`, LIST_LIMIT, LIST_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const empleadoId = new URL(request.url).searchParams.get("empleadoId") ?? undefined;

  try {
    const result = await resumenHorasService.getResumen(auth.context.userId, auth.context.role, empleadoId);
    const response: GetResumenHorasResponse =
      result.outcome === "ok" ? { outcome: "ok", data: toDto(result.data) } : { outcome: result.outcome };
    return NextResponse.json<GetResumenHorasResponse>(response);
  } catch (error) {
    console.error("[GET /api/mobile/v1/resumen-horas]", error);
    return serverError();
  }
});
