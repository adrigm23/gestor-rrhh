import { NextResponse } from "next/server";
import { fichajeService } from "../../../../../../services/fichaje";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { serializeFichajeEntry } from "../../_lib/serialize-clock";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import {
  ToggleFichajeRequestSchema,
  type ToggleFichajeResponse,
  type ApiErrorResponse,
} from "@gestor-rrhh/shared";

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

const badRequest = (message: string) =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "bad_request", message } },
    { status: 400 },
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

  let body: unknown = {};
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return badRequest("El cuerpo de la petición debe ser JSON válido.");
    }
  }

  const parsed = ToggleFichajeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("latitude/longitude inválidos.");
  }

  const coords =
    parsed.data.latitude !== undefined && parsed.data.longitude !== undefined
      ? { latitude: parsed.data.latitude, longitude: parsed.data.longitude }
      : undefined;

  try {
    const result = await fichajeService.toggleFichaje(auth.context.userId, coords);

    let response: ToggleFichajeResponse;
    if (result.outcome === "blocked-by-leave") {
      response = { outcome: "blocked-by-leave", leaveType: result.leaveType };
    } else if (result.outcome === "started") {
      response = { outcome: "started", shift: serializeFichajeEntry(result.shift) };
    } else {
      response = {
        outcome: "stopped",
        shift: serializeFichajeEntry(result.shift),
        closedPause: result.closedPause ? serializeFichajeEntry(result.closedPause) : null,
      };
    }

    return NextResponse.json<ToggleFichajeResponse>(response);
  } catch (error) {
    console.error("[POST /api/mobile/v1/fichajes/toggle]", error);
    return serverError();
  }
});
