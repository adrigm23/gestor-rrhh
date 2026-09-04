import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../services/usuario";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  UpdateProfileRequestSchema,
  type ApiErrorResponse,
  type UpdateProfileResponse,
  type UsuarioProfileDto,
} from "@gestor-rrhh/shared";

const READ_LIMIT = 30;
const READ_WINDOW_SECONDS = 60;
const WRITE_LIMIT = 10;
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

const badRequest = (message: string) =>
  NextResponse.json<ApiErrorResponse>({ error: { code: "bad_request", message } }, { status: 400 });

const notFound = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "not_found", message: "Usuario no encontrado." } },
    { status: 404 },
  );

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET", "PATCH"]);

export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(`me:read:${auth.context.userId}`, READ_LIMIT, READ_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const profile = await usuarioService.getProfile(auth.context.userId);
    if (!profile) {
      return notFound();
    }
    return NextResponse.json<UsuarioProfileDto>(profile);
  } catch (error) {
    console.error("[GET /api/mobile/v1/me]", error);
    return serverError();
  }
});

export const PATCH = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(`me:write:${auth.context.userId}`, WRITE_LIMIT, WRITE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser JSON válido.");
  }

  const parsed = UpdateProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Nombre y email son obligatorios.");
  }

  try {
    const result = await usuarioService.updateProfile(auth.context.userId, parsed.data);
    const response: UpdateProfileResponse =
      result.outcome === "ok" ? { outcome: "ok", profile: result.profile } : { outcome: "email-taken" };
    return NextResponse.json<UpdateProfileResponse>(response);
  } catch (error) {
    console.error("[PATCH /api/mobile/v1/me]", error);
    return serverError();
  }
});
