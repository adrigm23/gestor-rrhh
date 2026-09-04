import { GetMiEmpresaConfigResponseSchema, type GetMiEmpresaConfigResponse } from '@gestor-rrhh/shared';
import { apiRequest } from './client';

export async function getMiEmpresaConfig(): Promise<GetMiEmpresaConfigResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/mi-empresa');
  return GetMiEmpresaConfigResponseSchema.parse(body);
}
