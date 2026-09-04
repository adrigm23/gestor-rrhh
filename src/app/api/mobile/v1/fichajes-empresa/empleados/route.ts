import { NextResponse } from "next/server";
import { fichajesEmpresaService } from "../../../../../../services/fichajes-empresa";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, ListEmpleadosPorEmpresaResponse } from "@gestor-rrhh/shared";

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

// Selector de empleados para el filtro de la consola de fichajes de
// empresa. Igual que la web: vacío hasta que hay una empresa elegida.
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `fichajes-empresa:empleados:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  // GERENTE nunca necesita mandar empresaId (el servicio ignora el valor
  // recibido y resuelve siempre la suya); solo ADMIN_SISTEMA depende de
  // haber elegido una empresa, igual que en la web.
  const empresaId = new URL(request.url).searchParams.get("empresaId") ?? "";
  if (auth.context.role === "ADMIN_SISTEMA" && !empresaId) {
    return NextResponse.json<ListEmpleadosPorEmpresaResponse>({ empleados: [] });
  }

  try {
    const empleados = await fichajesEmpresaService.listEmpleadosPorEmpresa(
      auth.context.userId,
      auth.context.role,
      empresaId,
    );
    return NextResponse.json<ListEmpleadosPorEmpresaResponse>({ empleados });
  } catch (error) {
    console.error("[GET /api/mobile/v1/fichajes-empresa/empleados]", error);
    return serverError();
  }
});
