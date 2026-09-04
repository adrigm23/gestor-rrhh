import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../../../services/usuario";
import { rateLimitService } from "../../../../../../../services/rate-limit";
import { requireAuth } from "../../../_lib/require-auth";
import { tooManyRequests } from "../../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../../_lib/cors";
import {
  CambiarEmpresaUsuarioRequestSchema,
  type ApiErrorResponse,
  type CambiarEmpresaUsuarioResponse,
} from "@gestor-rrhh/shared";

const WRITE_LIMIT = 10;
const WRITE_WINDOW_SECONDS = 60;

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

const badRequest = (message: string) =>
  NextResponse.json<ApiErrorResponse>({ error: { code: "bad_request", message } }, { status: 400 });

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

// Igual que cambiarEmpresaUsuario en la web: exclusivo ADMIN_SISTEMA.
// Pendiente desde la Fase 2.13, cerrado en la 2.16.
export const POST = withMobileCors(async (request: Request, context: RouteContext) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `usuarios:cambiar-empresa:${auth.context.userId}`,
    WRITE_LIMIT,
    WRITE_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser JSON válido.");
  }

  const parsed = CambiarEmpresaUsuarioRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Empresa inválida.");
  }

  try {
    const result = await usuarioService.cambiarEmpresaUsuario(id, parsed.data.empresaId);
    return NextResponse.json<CambiarEmpresaUsuarioResponse>(result);
  } catch (error) {
    console.error("[POST /api/mobile/v1/usuarios/[id]/empresa]", error);
    return serverError();
  }
});
