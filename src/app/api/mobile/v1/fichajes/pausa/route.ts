import { NextResponse } from "next/server";
import { fichajeService } from "../../../../../../services/fichaje";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { serializeFichajeEntry } from "../../_lib/serialize-clock";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, TogglePausaResponse } from "@gestor-rrhh/shared";

const FICHAJES_WRITE_LIMIT = 10;
const FICHAJES_WRITE_WINDOW_SECONDS = 60;

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

export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `fichajes:write:${auth.context.userId}`,
    FICHAJES_WRITE_LIMIT,
    FICHAJES_WRITE_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const result = await fichajeService.togglePausa(auth.context.userId);

    let response: TogglePausaResponse;
    if (result.outcome === "blocked-by-leave") {
      response = { outcome: "blocked-by-leave", leaveType: result.leaveType };
    } else if (result.outcome === "no-active-shift") {
      response = { outcome: "no-active-shift" };
    } else if (result.outcome === "started") {
      response = { outcome: "started", pause: serializeFichajeEntry(result.pause) };
    } else {
      response = { outcome: "stopped", pause: serializeFichajeEntry(result.pause) };
    }

    return NextResponse.json<TogglePausaResponse>(response);
  } catch (error) {
    console.error("[POST /api/mobile/v1/fichajes/pausa]", error);
    return serverError();
  }
});
