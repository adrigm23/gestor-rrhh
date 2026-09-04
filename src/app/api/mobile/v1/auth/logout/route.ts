import { NextResponse } from "next/server";
import { authService } from "../../../../../../services/auth";
import { hashRefreshToken } from "../../../../../../services/auth/token-hash";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { requireRefreshToken } from "../../_lib/refresh-token";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, LogoutResponse } from "@gestor-rrhh/shared";

const LOGOUT_RATE_LIMIT_MAX = 10;
const LOGOUT_RATE_LIMIT_WINDOW_SECONDS = 60;

const unauthorized = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "unauthorized", message: "Refresh token inválido o ausente." } },
    { status: 401 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

export const POST = withMobileCors(async (request: Request) => {
  const refreshToken = requireRefreshToken(request);
  if (!refreshToken) {
    return unauthorized();
  }

  const rateLimitKey = `logout:token:${hashRefreshToken(refreshToken)}`;
  const limit = await rateLimitService.check(
    rateLimitKey,
    LOGOUT_RATE_LIMIT_MAX,
    LOGOUT_RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  await authService.revokeSession(refreshToken);

  // Respuesta idéntica exista o no la sesión, esté o no ya revocada: no se
  // distingue ningún estado para no filtrar información.
  return NextResponse.json<LogoutResponse>({ success: true });
});
