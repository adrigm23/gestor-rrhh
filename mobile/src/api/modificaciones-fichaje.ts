import {
  ListModificacionesFichajeResponseSchema,
  RespondModificacionFichajeRequestSchema,
  RespondModificacionFichajeResponseSchema,
  type ListModificacionesFichajeResponse,
  type RespondModificacionFichajeRequest,
  type RespondModificacionFichajeResponse,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function listModificacionesFichaje(): Promise<ListModificacionesFichajeResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/modificaciones-fichaje");
  return ListModificacionesFichajeResponseSchema.parse(body);
}

export async function respondModificacionFichaje(
  id: string,
  input: RespondModificacionFichajeRequest,
): Promise<RespondModificacionFichajeResponse> {
  const payload = RespondModificacionFichajeRequestSchema.parse(input);
  const result = await apiRequest<unknown>(`/api/mobile/v1/modificaciones-fichaje/${id}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return RespondModificacionFichajeResponseSchema.parse(result);
}
