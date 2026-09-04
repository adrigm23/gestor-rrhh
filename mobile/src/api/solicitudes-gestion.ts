import {
  ListSolicitudesManagerResponseSchema,
  UpdateSolicitudEstadoRequestSchema,
  UpdateSolicitudEstadoResponseSchema,
  type ListSolicitudesManagerResponse,
  type UpdateSolicitudEstadoRequest,
  type UpdateSolicitudEstadoResponse,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function listSolicitudesPendientes(): Promise<ListSolicitudesManagerResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/solicitudes/pendientes");
  return ListSolicitudesManagerResponseSchema.parse(body);
}

export async function listSolicitudesHistorialGestion(): Promise<ListSolicitudesManagerResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/solicitudes/historial");
  return ListSolicitudesManagerResponseSchema.parse(body);
}

export async function updateSolicitudEstado(
  id: string,
  input: UpdateSolicitudEstadoRequest,
): Promise<UpdateSolicitudEstadoResponse> {
  const payload = UpdateSolicitudEstadoRequestSchema.parse(input);
  const result = await apiRequest<unknown>(`/api/mobile/v1/solicitudes/${id}/estado`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return UpdateSolicitudEstadoResponseSchema.parse(result);
}
