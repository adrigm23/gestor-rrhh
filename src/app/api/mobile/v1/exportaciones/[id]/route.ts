import { NextResponse } from "next/server";
import { exportService } from "../../../../../../services/export";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, ExportacionStatusResponse } from "@gestor-rrhh/shared";

// Cada consulta puede disparar el procesado del job si aún no ha
// arrancado (igual que la web) — límite algo más generoso que una lectura
// pura porque el cliente hace polling.
const POLL_LIMIT = 30;
const POLL_WINDOW_SECONDS = 60;

type RouteContext = { params: Promise<{ id: string }> };

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

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

// Igual que obtenerExportacion en la web: cualquier usuario autenticado
// puede consultar SU PROPIO job (comprobado dentro del servicio por
// solicitadoPorId), no solo GERENTE/ADMIN_SISTEMA.
export const GET = withMobileCors(async (request: Request, context: RouteContext) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `exportaciones:status:${auth.context.userId}`,
    POLL_LIMIT,
    POLL_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const { id } = await context.params;

  try {
    const result = await exportService.obtenerExportacion(auth.context.userId, id);
    return NextResponse.json<ExportacionStatusResponse>(result);
  } catch (error) {
    console.error("[GET /api/mobile/v1/exportaciones/[id]]", error);
    return serverError();
  }
});
