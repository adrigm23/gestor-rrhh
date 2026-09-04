import {
  ClockStatusDtoSchema,
  ListFichajeHistoryResponseSchema,
  ToggleFichajeRequestSchema,
  ToggleFichajeResponseSchema,
  TogglePausaResponseSchema,
  type ClockStatusDto,
  type ListFichajeHistoryResponse,
  type ToggleFichajeResponse,
  type TogglePausaResponse,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function getFichajeStatus(): Promise<ClockStatusDto> {
  const body = await apiRequest<unknown>("/api/mobile/v1/fichajes/status");
  return ClockStatusDtoSchema.parse(body);
}

// Sin coordenadas por ahora (geolocalización queda fuera de esta fase, ver
// diseño acordado) — la API ya las admite opcionalmente si se añaden luego.
export async function toggleFichaje(
  coords?: { latitude: number; longitude: number },
): Promise<ToggleFichajeResponse> {
  const body = ToggleFichajeRequestSchema.parse(coords ?? {});
  const result = await apiRequest<unknown>("/api/mobile/v1/fichajes/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return ToggleFichajeResponseSchema.parse(result);
}

export async function togglePausa(): Promise<TogglePausaResponse> {
  const result = await apiRequest<unknown>("/api/mobile/v1/fichajes/pausa", {
    method: "POST",
  });
  return TogglePausaResponseSchema.parse(result);
}

export async function getFichajeHistorial(): Promise<ListFichajeHistoryResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/fichajes/historial");
  return ListFichajeHistoryResponseSchema.parse(body);
}
