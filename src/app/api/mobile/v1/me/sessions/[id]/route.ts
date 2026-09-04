import { NextResponse } from "next/server";
import { authService } from "../../../../../../../services/auth";
import { rateLimitService } from "../../../../../../../services/rate-limit";
import { requireAuth } from "../../../_lib/require-auth";
import { tooManyRequests } from "../../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../../_lib/cors";
import { type ApiErrorResponse, type RevokeSessionResponse } from "@gestor-rrhh/shared";

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

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["DELETE"]);

// Auditoría de seguridad (Fase 2.19, hallazgo #3): revoca UN dispositivo
// concreto. authService.revokeSessionForUser ya comprueba que la sesión
// pertenezca al usuario autenticado — aquí no hace falta repetir esa
// comprobación, solo pasar userId + id tal cual.
export const DELETE = withMobileCors(async (request: Request, context: RouteContext) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `me:sessions:write:${auth.context.userId}`,
    WRITE_LIMIT,
    WRITE_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const { id } = await context.params;

  try {
    const revoked = await authService.revokeSessionForUser(auth.context.userId, id);
    const response: RevokeSessionResponse = revoked
      ? { outcome: "ok" }
      : { outcome: "not-found" };
    return NextResponse.json<RevokeSessionResponse>(response);
  } catch (error) {
    console.error("[DELETE /api/mobile/v1/me/sessions/[id]]", error);
    return serverError();
  }
});
