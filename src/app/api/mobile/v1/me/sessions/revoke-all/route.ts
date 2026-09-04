import { NextResponse } from "next/server";
import { authService } from "../../../../../../../services/auth";
import { rateLimitService } from "../../../../../../../services/rate-limit";
import { requireAuth } from "../../../_lib/require-auth";
import { tooManyRequests } from "../../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../../_lib/cors";
import { type ApiErrorResponse, type RevokeAllSessionsResponse } from "@gestor-rrhh/shared";

const WRITE_LIMIT = 5;
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

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

// Auditoría de seguridad (Fase 2.19, hallazgo #3): revoca TODAS las
// sesiones móviles del usuario, incluida la que está usando ahora mismo
// para llamar a esto — su próximo refresh fallará y tendrá que volver a
// iniciar sesión en todos los dispositivos. Mismo comportamiento que ya
// dispara un cambio de contraseña (usuarioService.changePassword).
export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `me:sessions:revoke-all:${auth.context.userId}`,
    WRITE_LIMIT,
    WRITE_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const revokedCount = await authService.revokeAllSessions(auth.context.userId);
    return NextResponse.json<RevokeAllSessionsResponse>({ outcome: "ok", revokedCount });
  } catch (error) {
    console.error("[POST /api/mobile/v1/me/sessions/revoke-all]", error);
    return serverError();
  }
});
