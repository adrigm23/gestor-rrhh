import { NextResponse } from "next/server";
import { modificacionFichajeService } from "../../../../../services/modificacion-fichaje";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  CreateModificacionFichajeRequestSchema,
  type ApiErrorResponse,
  type CreateModificacionFichajeResponse,
  type ListModificacionesManagerResponse,
  type SolicitudModificacionManagerDto,
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

function toDto(
  entry: Awaited<ReturnType<typeof modificacionFichajeService.listRecentForManager>>[number],
): SolicitudModificacionManagerDto {
  return {
    id: entry.id,
    empleadoNombre: entry.empleadoNombre,
    empleadoEmail: entry.empleadoEmail,
    estado: entry.estado,
    entradaPropuesta: entry.entradaPropuesta ? entry.entradaPropuesta.toISOString() : null,
    salidaPropuesta: entry.salidaPropuesta ? entry.salidaPropuesta.toISOString() : null,
    motivo: entry.motivo,
    createdAt: entry.createdAt.toISOString(),
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET", "POST"]);

export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `modificaciones-fichaje-gestion:list:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const solicitudes = await modificacionFichajeService.listRecentForManager(
      auth.context.userId,
      auth.context.role,
      20,
    );
    return NextResponse.json<ListModificacionesManagerResponse>({ solicitudes: solicitudes.map(toDto) });
  } catch (error) {
    console.error("[GET /api/mobile/v1/modificaciones-fichaje-gestion]", error);
    return serverError();
  }
});

export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `modificaciones-fichaje-gestion:write:${auth.context.userId}`,
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

  const parsed = CreateModificacionFichajeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de la solicitud inválidos.");
  }

  const entrada = parsed.data.entrada ? new Date(parsed.data.entrada) : null;
  const salida = parsed.data.salida ? new Date(parsed.data.salida) : null;
  if (entrada && salida && salida.getTime() <= entrada.getTime()) {
    return badRequest("La salida debe ser posterior a la entrada.");
  }

  try {
    const result = await modificacionFichajeService.create(auth.context.userId, auth.context.role, {
      empleadoId: parsed.data.empleadoId,
      fichajeId: parsed.data.fichajeId ?? null,
      entradaPropuesta: entrada,
      salidaPropuesta: salida,
      motivo: parsed.data.motivo ?? null,
    });
    return NextResponse.json<CreateModificacionFichajeResponse>(result);
  } catch (error) {
    console.error("[POST /api/mobile/v1/modificaciones-fichaje-gestion]", error);
    return serverError();
  }
});
