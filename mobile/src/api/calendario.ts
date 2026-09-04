import { GetCalendarioResponseSchema, type GetCalendarioResponse } from '@gestor-rrhh/shared';
import { apiRequest } from './client';

export async function getCalendario(desde: string, hasta: string): Promise<GetCalendarioResponse> {
  const params = new URLSearchParams({ desde, hasta });
  const body = await apiRequest<unknown>(`/api/mobile/v1/calendario?${params.toString()}`);
  return GetCalendarioResponseSchema.parse(body);
}
