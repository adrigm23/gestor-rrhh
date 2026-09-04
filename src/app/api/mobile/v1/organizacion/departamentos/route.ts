import { NextResponse } from "next/server";
import { organizacionService } from "../../../../../../services/organizacion";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import {
  CrearDepartamentoRequestSchema,
  type ApiErrorResponse,
  type CrearDepartamentoResponse,
  type ListDepartamentosOrgResponse,
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

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET", "POST"]);

// Igual que dashboard/departamentos en la web: GERENTE (acotado a su
// empresa) y ADMIN_SISTEMA (todas), nunca EMPLEADO. Distinto del
// "/departamentos" de la Fase 2.13 (selector minimalista solo-ADMIN para
// el alta de usuario) — este es el listado completo de gestión.
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `organizacion:departamentos:list:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const departamentos = await organizacionService.listDepartamentos(auth.context.userId, auth.context.role);
    return NextResponse.json<ListDepartamentosOrgResponse>({ departamentos });
  } catch (error) {
    console.error("[GET /api/mobile/v1/organizacion/departamentos]", error);
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
    `organizacion:departamentos:create:${auth.context.userId}`,
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

  const parsed = CrearDepartamentoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de departamento inválidos.");
  }

  try {
    const result = await organizacionService.crearDepartamento(auth.context.userId, auth.context.role, {
      nombre: parsed.data.nombre,
      gerenteId: parsed.data.gerenteId ?? null,
      centroTrabajoId: parsed.data.centroTrabajoId ?? null,
      empresaId: parsed.data.empresaId ?? null,
    });
    return NextResponse.json<CrearDepartamentoResponse>(result);
  } catch (error) {
    console.error("[POST /api/mobile/v1/organizacion/departamentos]", error);
    return serverError();
  }
});
