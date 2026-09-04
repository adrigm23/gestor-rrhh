import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../services/usuario";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import { toDirectoryEntryDto } from "../_lib/directory-dto";
import type { ApiErrorResponse, ListDirectoryResponse } from "@gestor-rrhh/shared";

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

// Directorio de empleados (Fase 2.13): GERENTE (acotado a su empresa,
// solo EMPLEADO) y ADMIN_SISTEMA (todas las empresas, EMPLEADO+GERENTE).
// A diferencia de la web, no permite buscar por hash NFC (simplificación
// deliberada para móvil, ver diseño de la Fase 2.13).
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(`directorio:list:${auth.context.userId}`, LIST_LIMIT, LIST_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const empresaId = url.searchParams.get("empresaId") ?? undefined;
  const rolParam = url.searchParams.get("rol");
  const rol = rolParam === "EMPLEADO" || rolParam === "GERENTE" ? rolParam : undefined;
  const estadoParam = url.searchParams.get("estado");
  const estado = estadoParam === "activos" || estadoParam === "baja" || estadoParam === "todos" ? estadoParam : undefined;
  const pageParam = url.searchParams.get("page");
  const page = pageParam ? Number.parseInt(pageParam, 10) : undefined;

  try {
    const result = await usuarioService.listDirectory(auth.context.userId, auth.context.role, {
      query,
      empresaId,
      rol,
      estado,
      page: page && Number.isFinite(page) && page > 0 ? page : undefined,
    });
    const response: ListDirectoryResponse = {
      usuarios: result.usuarios.map(toDirectoryEntryDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
    return NextResponse.json<ListDirectoryResponse>(response);
  } catch (error) {
    console.error("[GET /api/mobile/v1/directorio]", error);
    return serverError();
  }
});
