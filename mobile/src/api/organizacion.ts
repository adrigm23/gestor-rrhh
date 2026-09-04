import {
  CrearCentroTrabajoRequestSchema,
  CrearCentroTrabajoResponseSchema,
  CrearDepartamentoRequestSchema,
  CrearDepartamentoResponseSchema,
  ListCentrosResponseSchema,
  ListDepartamentosOrgResponseSchema,
  ListGerentesOptionsResponseSchema,
  UpdateCentroDireccionRequestSchema,
  UpdateCentroDireccionResponseSchema,
  type CrearCentroTrabajoRequest,
  type CrearCentroTrabajoResponse,
  type CrearDepartamentoRequest,
  type CrearDepartamentoResponse,
  type ListCentrosResponse,
  type ListDepartamentosOrgResponse,
  type ListGerentesOptionsResponse,
  type UpdateCentroDireccionResponse,
} from '@gestor-rrhh/shared';
import { apiRequest } from './client';

export async function listCentros(): Promise<ListCentrosResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/organizacion/centros-trabajo');
  return ListCentrosResponseSchema.parse(body);
}

export async function crearCentroTrabajo(input: CrearCentroTrabajoRequest): Promise<CrearCentroTrabajoResponse> {
  const payload = CrearCentroTrabajoRequestSchema.parse(input);
  const body = await apiRequest<unknown>('/api/mobile/v1/organizacion/centros-trabajo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CrearCentroTrabajoResponseSchema.parse(body);
}

export async function updateCentroDireccion(id: string, direccion: string): Promise<UpdateCentroDireccionResponse> {
  const payload = UpdateCentroDireccionRequestSchema.parse({ direccion: direccion || undefined });
  const body = await apiRequest<unknown>(`/api/mobile/v1/organizacion/centros-trabajo/${id}/direccion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return UpdateCentroDireccionResponseSchema.parse(body);
}

export async function listDepartamentosOrg(): Promise<ListDepartamentosOrgResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/organizacion/departamentos');
  return ListDepartamentosOrgResponseSchema.parse(body);
}

export async function crearDepartamento(input: CrearDepartamentoRequest): Promise<CrearDepartamentoResponse> {
  const payload = CrearDepartamentoRequestSchema.parse(input);
  const body = await apiRequest<unknown>('/api/mobile/v1/organizacion/departamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CrearDepartamentoResponseSchema.parse(body);
}

export async function listGerentesOptions(): Promise<ListGerentesOptionsResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/organizacion/gerentes');
  return ListGerentesOptionsResponseSchema.parse(body);
}
