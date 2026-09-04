import { NextResponse } from "next/server";
import { calendarioService } from "../../../../../services/calendario";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import type { ApiErrorResponse, GetCalendarioResponse } from "@gestor-rrhh/shared";

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

const badRequest = (message: string) =>
  NextResponse.json<ApiErrorResponse>({ error: { code: "bad_request", message } }, { status: 400 });

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

// Solicitudes + fichajes del propio usuario en un rango de fechas, para
// pintar el calendario visual (Fase 2.17). Cualquier usuario autenticado
// puede consultar el suyo — igual que dashboard/calendario en la web, sin
// restricción de rol.
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(`calendario:get:${auth.context.userId}`, LIST_LIMIT, LIST_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const url = new URL(request.url);
  const desdeParam = url.searchParams.get("desde");
  const hastaParam = url.searchParams.get("hasta");
  if (!desdeParam || !hastaParam) {
    return badRequest("Rango de fechas requerido.");
  }

  const desde = new Date(`${desdeParam}T00:00:00`);
  const hasta = new Date(`${hastaParam}T23:59:59.999`);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    return badRequest("Rango de fechas inválido.");
  }

  try {
    const { solicitudes, fichajes } = await calendarioService.getRango(auth.context.userId, desde, hasta);
    const response: GetCalendarioResponse = {
      solicitudes: solicitudes.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        estado: s.estado,
        inicio: s.inicio.toISOString(),
        fin: s.fin ? s.fin.toISOString() : null,
        motivo: s.motivo,
        ausenciaTipo: s.ausenciaTipo,
        createdAt: s.createdAt.toISOString(),
      })),
      fichajes: fichajes.map((f) => ({
        entrada: f.entrada.toISOString(),
        salida: f.salida ? f.salida.toISOString() : null,
      })),
    };
    return NextResponse.json<GetCalendarioResponse>(response);
  } catch (error) {
    console.error("[GET /api/mobile/v1/calendario]", error);
    return serverError();
  }
});
