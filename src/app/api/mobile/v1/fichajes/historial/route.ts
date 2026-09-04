import { NextResponse } from "next/server";
import { fichajeService } from "../../../../../../services/fichaje";
import { rateLimitService } from "../../../../../../services/rate-limit";
import { requireAuth } from "../../_lib/require-auth";
import { tooManyRequests } from "../../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../../_lib/cors";
import type { ApiErrorResponse, FichajeHistoryEntryDto, ListFichajeHistoryResponse } from "@gestor-rrhh/shared";

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
  entry: Awaited<ReturnType<typeof fichajeService.listHistory>>[number],
): FichajeHistoryEntryDto {
  return {
    id: entry.id,
    tipo: entry.tipo,
    entrada: entry.entrada.toISOString(),
    salida: entry.salida ? entry.salida.toISOString() : null,
    editado: entry.editado,
  };
}

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["GET"]);

export const GET = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }

  const limit = await rateLimitService.check(
    `fichajes:historial:${auth.context.userId}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  try {
    const historial = await fichajeService.listHistory(auth.context.userId, 30);
    return NextResponse.json<ListFichajeHistoryResponse>({ historial: historial.map(toDto) });
  } catch (error) {
    console.error("[GET /api/mobile/v1/fichajes/historial]", error);
    return serverError();
  }
});
