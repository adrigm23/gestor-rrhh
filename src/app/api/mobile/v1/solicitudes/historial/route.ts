import { NextResponse } from "next/server";
import { solicitudService } from "../../../../../../services/solicitud";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, ListSolicitudesManagerResponse, SolicitudManagerDto } from "@gestor-rrhh/shared";

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
  entry: Awaited<ReturnType<typeof solicitudService.listHistoryForManager>>[number],
): SolicitudManagerDto {
  return {
    id: entry.id,
    tipo: entry.tipo,
    estado: entry.estado,
    inicio: entry.inicio.toISOString(),
    fin: entry.fin ? entry.fin.toISOString() : null,
    motivo: entry.motivo,
    ausenciaTipo: entry.ausenciaTipo,
    createdAt: entry.createdAt.toISOString(),
    usuarioNombre: entry.usuarioNombre,
    usuarioEmail: entry.usuarioEmail,
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `solicitudes:historial-gestion:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const solicitudes = await solicitudService.listHistoryForManager(auth.context.userId, auth.context.role, 10);
    return NextResponse.json<ListSolicitudesManagerResponse>({ solicitudes: solicitudes.map(toDto) });
  } catch (error) {
    console.error("[GET /api/mobile/v1/solicitudes/historial]", error);
    return serverError();
  }
});
