import {
  ActualizarConfigEmpresaRequestSchema,
  ActualizarConfigEmpresaResponseSchema,
  CrearEmpresaRequestSchema,
  CrearEmpresaResponseSchema,
  EliminarEmpresaResponseSchema,
  ListEmpresasAdminResponseSchema,
  type ActualizarConfigEmpresaRequest,
  type ActualizarConfigEmpresaResponse,
  type CrearEmpresaRequest,
  type CrearEmpresaResponse,
  type EliminarEmpresaResponse,
  type ListEmpresasAdminResponse,
} from '@gestor-rrhh/shared';
import { apiRequest } from './client';

export async function listEmpresasAdmin(): Promise<ListEmpresasAdminResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/empresas-admin');
  return ListEmpresasAdminResponseSchema.parse(body);
}

export async function crearEmpresaAdmin(input: CrearEmpresaRequest): Promise<CrearEmpresaResponse> {
  const payload = CrearEmpresaRequestSchema.parse(input);
  const body = await apiRequest<unknown>('/api/mobile/v1/empresas-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CrearEmpresaResponseSchema.parse(body);
}

export async function eliminarEmpresaAdmin(id: string): Promise<EliminarEmpresaResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/empresas-admin/${id}`, { method: 'DELETE' });
  return EliminarEmpresaResponseSchema.parse(body);
}

export async function actualizarConfigEmpresa(
  id: string,
  input: ActualizarConfigEmpresaRequest,
): Promise<ActualizarConfigEmpresaResponse> {
  const payload = ActualizarConfigEmpresaRequestSchema.parse(input);
  const body = await apiRequest<unknown>(`/api/mobile/v1/empresas-admin/${id}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return ActualizarConfigEmpresaResponseSchema.parse(body);
}
