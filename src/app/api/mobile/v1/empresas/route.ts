import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../services/usuario";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import type { ApiErrorResponse, ListEmpresasOptionsResponse } from "@gestor-rrhh/shared";

const LIST_LIMIT = 30;
const LIST_WINDOW_SECONDS = 60;

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

// Selector para el formulario de creación de usuario (solo ADMIN_SISTEMA).
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(`empresas:list:${auth.context.userId}`, LIST_LIMIT, LIST_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const empresas = await usuarioService.listEmpresasOptions();
    return NextResponse.json<ListEmpresasOptionsResponse>({ empresas });
  } catch (error) {
    console.error("[GET /api/mobile/v1/empresas]", error);
    return serverError();
  }
});
