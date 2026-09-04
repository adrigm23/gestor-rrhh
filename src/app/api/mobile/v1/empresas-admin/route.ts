import { NextResponse } from "next/server";
import { empresaService } from "../../../../../services/empresa";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  CrearEmpresaRequestSchema,
  type ApiErrorResponse,
  type CrearEmpresaResponse,
  type EmpresaEntryDto,
  type ListEmpresasAdminResponse,
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

function toDto(entry: Awaited<ReturnType<typeof empresaService.listEmpresas>>[number]): EmpresaEntryDto {
  return {
    id: entry.id,
    nombre: entry.nombre,
    cif: entry.cif,
    pausaCuentaComoTrabajo: entry.pausaCuentaComoTrabajo,
    geolocalizacionFichaje: entry.geolocalizacionFichaje,
    createdAt: entry.createdAt.toISOString(),
    usuariosCount: entry.usuariosCount,
    departamentosCount: entry.departamentosCount,
    centrosTrabajoCount: entry.centrosTrabajoCount,
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET", "POST"]);

// Igual que dashboard/empresas en la web: exclusivo ADMIN_SISTEMA.
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(`empresas-admin:list:${auth.context.userId}`, LIST_LIMIT, LIST_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const empresas = await empresaService.listEmpresas();
    return NextResponse.json<ListEmpresasAdminResponse>({ empresas: empresas.map(toDto) });
  } catch (error) {
    console.error("[GET /api/mobile/v1/empresas-admin]", error);
    return serverError();
  }
});

export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `empresas-admin:create:${auth.context.userId}`,
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

  const parsed = CrearEmpresaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de empresa inválidos.");
  }

  try {
    const result = await empresaService.crearEmpresa({
      nombre: parsed.data.nombre,
      cif: parsed.data.cif.toUpperCase(),
    });
    return NextResponse.json<CrearEmpresaResponse>(result);
  } catch (error) {
    console.error("[POST /api/mobile/v1/empresas-admin]", error);
    return serverError();
  }
});
