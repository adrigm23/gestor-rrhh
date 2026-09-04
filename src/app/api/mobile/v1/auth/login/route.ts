import { NextResponse } from "next/server";
import { authService } from "../../../../../../services/auth";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { getClientIp } from "../../../../../lib/client-ip";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import {
  LoginRequestSchema,
  type LoginResponse,
  type ApiErrorResponse,
} from "@gestor-rrhh/shared";

const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_EMAIL_WINDOW_SECONDS = 15 * 60;
const LOGIN_IP_LIMIT = 30;
const LOGIN_IP_WINDOW_SECONDS = 15 * 60;

const invalidCredentials = () =>
  NextResponse.json<LoginResponse>({ outcome: "invalid-credentials" }, { status: 401 });

const badRequest = (message: string) =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "bad_request", message } },
    { status: 400 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

export const POST = withMobileCors(async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser JSON válido.");
  }

  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("email o password inválidos.");
  }

  const emailKey = `login:email:${parsed.data.email.toLowerCase()}`;
  const emailLimit = await rateLimitService.check(
    emailKey,
    LOGIN_EMAIL_LIMIT,
    LOGIN_EMAIL_WINDOW_SECONDS,
  );
  if (!emailLimit.allowed) {
    return tooManyRequests(emailLimit.retryAfterSeconds);
  }

  const ipKey = `login:ip:${getClientIp(request.headers)}`;
  const ipLimit = await rateLimitService.check(ipKey, LOGIN_IP_LIMIT, LOGIN_IP_WINDOW_SECONDS);
  if (!ipLimit.allowed) {
    return tooManyRequests(ipLimit.retryAfterSeconds);
  }

  const result = await authService.verifyCredentials(
    parsed.data.email,
    parsed.data.password,
  );

  // "blocked" e "invalid-credentials" se responden igual hacia fuera:
  // no se revela si la cuenta existe ni si está bloqueada.
  if (result.outcome !== "ok") {
    return invalidCredentials();
  }

  const tokens = await authService.issueTokenPair(
    {
      userId: result.user.userId,
      role: result.user.role,
      empresaId: result.user.empresaId,
      passwordMustChange: result.user.passwordMustChange,
    },
    { deviceName: parsed.data.deviceName, platform: parsed.data.platform },
  );

  return NextResponse.json<LoginResponse>({
    outcome: "ok",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.accessTokenExpiresIn,
    user: {
      id: result.user.userId,
      role: result.user.role,
      empresaId: result.user.empresaId,
      passwordMustChange: result.user.passwordMustChange,
    },
  });
});
