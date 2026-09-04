import { NextResponse } from "next/server";
import { fichajesEmpresaService } from "../../../../../services/fichajes-empresa";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import type {
  ApiErrorResponse,
  FichajeEmpresaEntryDto,
  ListFichajesEmpresaResponse,
} from "@gestor-rrhh/shared";

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

function toDto(
  entry: Awaited<ReturnType<typeof fichajesEmpresaService.listFichajes>>["fichajes"][number],
): FichajeEmpresaEntryDto {
  return {
    id: entry.id,
    empleadoNombre: entry.empleadoNombre,
    empleadoEmail: entry.empleadoEmail,
    empresaNombre: entry.empresaNombre,
    entrada: entry.entrada.toISOString(),
    salida: entry.salida ? entry.salida.toISOString() : null,
    tipo: entry.tipo,
    editado: entry.editado,
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

// Igual que dashboard/fichajes en la web: GERENTE (acotado a su empresa) y
// ADMIN_SISTEMA (cualquiera, con filtro opcional de empresa). Solo
// lectura: no hay acción de "validar" (el badge de la web es derivado).
export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "GERENTE" && auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(
    `fichajes-empresa:list:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  const url = new URL(request.url);
  const empresaId = url.searchParams.get("empresaId") ?? undefined;
  const empleadoId = url.searchParams.get("empleadoId") ?? undefined;
  const estadoParam = url.searchParams.get("estado");
  const estado = estadoParam === "abierto" || estadoParam === "cerrado" ? estadoParam : "todos";
  const tipoParam = url.searchParams.get("tipo");
  const tipo =
    tipoParam === "JORNADA" || tipoParam === "PAUSA_COMIDA" || tipoParam === "DESCANSO" || tipoParam === "MEDICO"
      ? tipoParam
      : "todos";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const desde = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const hasta = toParam ? new Date(`${toParam}T23:59:59`) : undefined;

  try {
    const result = await fichajesEmpresaService.listFichajes(auth.context.userId, auth.context.role, {
      empresaId,
      empleadoId,
      estado,
      tipo,
      desde: desde && !Number.isNaN(desde.getTime()) ? desde : undefined,
      hasta: hasta && !Number.isNaN(hasta.getTime()) ? hasta : undefined,
    });
    const response: ListFichajesEmpresaResponse = {
      fichajes: result.fichajes.map(toDto),
      total: result.total,
      canQuery: result.canQuery,
    };
    return NextResponse.json<ListFichajesEmpresaResponse>(response);
  } catch (error) {
    console.error("[GET /api/mobile/v1/fichajes-empresa]", error);
    return serverError();
  }
});
