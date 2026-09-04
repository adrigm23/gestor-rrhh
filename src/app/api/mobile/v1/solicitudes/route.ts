import { NextResponse } from "next/server";
import { solicitudService } from "../../../../../services/solicitud";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  CreateSolicitudRequestSchema,
  type ApiErrorResponse,
  type CreateSolicitudResponse,
  type ListSolicitudesResponse,
  type SolicitudDto,
} from "@gestor-rrhh/shared";

const LIST_LIMIT = 30;
const LIST_WINDOW_SECONDS = 60;
const WRITE_LIMIT = 10;
const WRITE_WINDOW_SECONDS = 60;

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

// Mismo parseo que el formulario web (solicitudes-actions.ts): fecha
// "AAAA-MM-DD" resuelta a medianoche local del servidor.
function parseDateOnly(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDto(solicitud: Awaited<ReturnType<typeof solicitudService.listRecent>>[number]): SolicitudDto {
  return {
    id: solicitud.id,
    tipo: solicitud.tipo,
    estado: solicitud.estado,
    inicio: solicitud.inicio.toISOString(),
    fin: solicitud.fin ? solicitud.fin.toISOString() : null,
    motivo: solicitud.motivo,
    ausenciaTipo: solicitud.ausenciaTipo,
    createdAt: solicitud.createdAt.toISOString(),
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET", "POST"]);

export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `solicitudes:list:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const solicitudes = await solicitudService.listRecent(auth.context.userId);
    return NextResponse.json<ListSolicitudesResponse>({ solicitudes: solicitudes.map(toDto) });
  } catch (error) {
    console.error("[GET /api/mobile/v1/solicitudes]", error);
    return serverError();
  }
});

export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `solicitudes:write:${auth.context.userId}`,
    WRITE_LIMIT,
    WRITE_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser JSON válido.");
  }

  const parsed = CreateSolicitudRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de la solicitud inválidos.");
  }

  const inicio = parseDateOnly(parsed.data.inicio);
  if (!inicio) {
    return badRequest("Fecha de inicio inválida.");
  }
  const fin = parsed.data.fin ? parseDateOnly(parsed.data.fin) : inicio;
  if (!fin) {
    return badRequest("Fecha de fin inválida.");
  }
  if (fin.getTime() < inicio.getTime()) {
    return badRequest("La fecha de fin no puede ser menor que la de inicio.");
  }

  try {
    const result =
      parsed.data.tipo === "VACACIONES"
        ? await solicitudService.create(auth.context.userId, {
            tipo: "VACACIONES",
            inicio,
            fin,
            motivo: parsed.data.motivo ?? null,
          })
        : await solicitudService.create(auth.context.userId, {
            tipo: "AUSENCIA",
            inicio,
            fin,
            motivo: parsed.data.motivo ?? null,
            ausenciaTipo: parsed.data.ausenciaTipo,
          });

    let response: CreateSolicitudResponse;
    if (result.outcome === "ok") {
      response = { outcome: "ok", solicitud: toDto(result.solicitud) };
    } else if (result.outcome === "overlap") {
      response = { outcome: "overlap" };
    } else {
      response = { outcome: "invalid-date-range", message: result.message };
    }

    return NextResponse.json<CreateSolicitudResponse>(response);
  } catch (error) {
    console.error("[POST /api/mobile/v1/solicitudes]", error);
    return serverError();
  }
});
