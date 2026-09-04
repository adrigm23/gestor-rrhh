import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../services/usuario";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  CrearContratoRequestSchema,
  type ApiErrorResponse,
  type CrearContratoResponse,
} from "@gestor-rrhh/shared";

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

// "AAAA-MM-DD" -> Date a medianoche local, igual que parseDateInput en la
// web. Si no se envía fecha, se usa "ahora" (igual que el fallback web).
function parseFechaInicio(value: string | undefined): Date | null {
  if (!value) return new Date();
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

// Igual que crearContrato en la web: GERENTE (acotado a su empresa) y
// ADMIN_SISTEMA.
export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(`contratos:create:${auth.context.userId}`, WRITE_LIMIT, WRITE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser JSON válido.");
  }

  const parsed = CrearContratoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de contrato inválidos.");
  }

  const fechaInicio = parseFechaInicio(parsed.data.fechaInicio);
  if (!fechaInicio) {
    return badRequest("Fecha de inicio inválida.");
  }

  try {
    const result = await usuarioService.crearContrato(auth.context.userId, auth.context.role, {
      empleadoId: parsed.data.empleadoId,
      horasSemanales: parsed.data.horasSemanales,
      fechaInicio,
    });
    const response: CrearContratoResponse =
      result.outcome === "invalid-start-date"
        ? { outcome: "invalid-start-date", message: result.message }
        : { outcome: result.outcome };
    return NextResponse.json<CrearContratoResponse>(response);
  } catch (error) {
    console.error("[POST /api/mobile/v1/contratos]", error);
    return serverError();
  }
});
