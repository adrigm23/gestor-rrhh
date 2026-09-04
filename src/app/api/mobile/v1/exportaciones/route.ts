import { NextResponse } from "next/server";
import { exportService } from "../../../../../services/export";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  CrearExportacionRequestSchema,
  type ApiErrorResponse,
  type CrearExportacionResponse,
} from "@gestor-rrhh/shared";

// Baja: crear un job de exportación dispara la generación del CSV
// (Supabase upload incluido) dentro de la propia petición.
const WRITE_LIMIT = 6;
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

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

// Igual que crearExportacion en la web: GERENTE (acotado a su empresa) y
// ADMIN_SISTEMA.
export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `exportaciones:create:${auth.context.userId}`,
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

  const parsed = CrearExportacionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de exportación inválidos.");
  }

  try {
    const result = await exportService.crearExportacion(auth.context.userId, auth.context.role, {
      tipo: parsed.data.tipo,
      filtros: {
        from: parsed.data.from,
        to: parsed.data.to,
        estado: parsed.data.estado ?? "todos",
        tipo: parsed.data.tipoFiltro ?? "todos",
        empresaId: parsed.data.empresaId,
        empleadoId: parsed.data.empleadoId,
      },
      empresaIdForm: parsed.data.empresaId ?? null,
    });
    return NextResponse.json<CrearExportacionResponse>(result);
  } catch (error) {
    console.error("[POST /api/mobile/v1/exportaciones]", error);
    return serverError();
  }
});
