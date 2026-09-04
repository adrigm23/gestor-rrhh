import { NextResponse } from "next/server";
import { authService } from "../../../../../../services/auth";
import { RateLimitExceededError } from "../../../../../../services/auth/errors";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { requireRefreshToken } from "../../_lib/refresh-token";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, RefreshResponse } from "@gestor-rrhh/shared";

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

  try {
    const { accessToken, refreshToken: rotatedRefreshToken, accessTokenExpiresIn } =
      await authService.refreshAccessToken(refreshToken);

    return NextResponse.json<RefreshResponse>({
      accessToken,
      refreshToken: rotatedRefreshToken,
      expiresIn: accessTokenExpiresIn,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return tooManyRequests(error.retryAfterSeconds);
    }
    // Nunca distinguir token expirado / inválido / usuario eliminado.
    return unauthorized();
  }
});
