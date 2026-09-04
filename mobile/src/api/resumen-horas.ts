import { GetResumenHorasResponseSchema, type GetResumenHorasResponse } from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function getResumenHoras(empleadoId?: string): Promise<GetResumenHorasResponse> {
  const query = empleadoId ? `?empleadoId=${encodeURIComponent(empleadoId)}` : "";
  const body = await apiRequest<unknown>(`/api/mobile/v1/resumen-horas${query}`);
  return GetResumenHorasResponseSchema.parse(body);
}
