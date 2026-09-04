import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../../../services/usuario";
import { rateLimitService } from "../../../../../../../services/rate-limit";
import { requireAuth } from "../../../_lib/require-auth";
import { tooManyRequests } from "../../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../../_lib/cors";
import {
  UpdateEmailAdminRequestSchema,
  type ApiErrorResponse,
  type UpdateEmailAdminResponse,
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

// Igual que actualizarEmailUsuario en la web: solo ADMIN_SISTEMA.
export const POST = withMobileCors(async (request: Request, context: RouteContext) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `usuarios:update-email:${auth.context.userId}`,
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

  const parsed = UpdateEmailAdminRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Email inválido.");
  }

  try {
    const result = await usuarioService.updateEmailAdmin(id, parsed.data.email);
    return NextResponse.json<UpdateEmailAdminResponse>(result);
  } catch (error) {
    console.error("[POST /api/mobile/v1/usuarios/[id]/email]", error);
    return serverError();
  }
});
