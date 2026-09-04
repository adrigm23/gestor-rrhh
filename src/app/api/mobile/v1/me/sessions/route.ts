import { NextResponse } from "next/server";
import { authService } from "../../../../../../services/auth";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import { type ApiErrorResponse, type ListSessionsResponse } from "@gestor-rrhh/shared";

const READ_LIMIT = 30;
const READ_WINDOW_SECONDS = 60;

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

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

// Auditoría de seguridad (Fase 2.19, hallazgo #3): lista los dispositivos
// con sesión móvil activa del usuario autenticado, para que pueda detectar
// y revocar un dispositivo que ya no reconoce.
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `me:sessions:read:${auth.context.userId}`,
    READ_LIMIT,
    READ_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const sessions = await authService.listSessions(auth.context.userId);
    return NextResponse.json<ListSessionsResponse>({
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        platform: s.platform,
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt ? s.lastUsedAt.toISOString() : null,
        expiresAt: s.expiresAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/mobile/v1/me/sessions]", error);
    return serverError();
  }
});
