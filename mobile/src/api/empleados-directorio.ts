import {
  AdminTargetResponseSchema,
  CambiarEmpresaUsuarioRequestSchema,
  CambiarEmpresaUsuarioResponseSchema,
  CreateUsuarioRequestSchema,
  CreateUsuarioResponseSchema,
  CrearContratoRequestSchema,
  CrearContratoResponseSchema,
  EliminarUsuarioResponseSchema,
  GetEmpleadoDetailResponseSchema,
  ListDepartamentosOptionsResponseSchema,
  ListDirectoryResponseSchema,
  ListEmpresasOptionsResponseSchema,
  ResetPasswordAdminRequestSchema,
  UpdateDniAdminRequestSchema,
  UpdateDniAdminResponseSchema,
  UpdateEmailAdminRequestSchema,
  UpdateEmailAdminResponseSchema,
  UpdateEstadoRequestSchema,
  UpdateEstadoResponseSchema,
  type AdminTargetResponse,
  type CambiarEmpresaUsuarioResponse,
  type CreateUsuarioRequest,
  type CreateUsuarioResponse,
  type CrearContratoRequest,
  type CrearContratoResponse,
  type EliminarUsuarioResponse,
  type GetEmpleadoDetailResponse,
  type ListDepartamentosOptionsResponse,
  type ListDirectoryResponse,
  type ListEmpresasOptionsResponse,
  type UpdateDniAdminResponse,
  type UpdateEmailAdminResponse,
  type UpdateEstadoResponse,
} from '@gestor-rrhh/shared';
import { apiRequest } from './client';

export type DirectoryFilters = {
  query?: string;
  empresaId?: string;
  rol?: 'EMPLEADO' | 'GERENTE';
  estado?: 'activos' | 'baja' | 'todos';
  page?: number;
};

function buildQuery(filters: DirectoryFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.empresaId) params.set('empresaId', filters.empresaId);
  if (filters.rol) params.set('rol', filters.rol);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.page) params.set('page', String(filters.page));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listDirectory(filters: DirectoryFilters): Promise<ListDirectoryResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/directorio${buildQuery(filters)}`);
  return ListDirectoryResponseSchema.parse(body);
}

export async function getEmpleadoDetail(id: string): Promise<GetEmpleadoDetailResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/directorio/${id}`);
  return GetEmpleadoDetailResponseSchema.parse(body);
}

export async function listDepartamentosOptions(): Promise<ListDepartamentosOptionsResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/departamentos');
  return ListDepartamentosOptionsResponseSchema.parse(body);
}

export async function listEmpresasOptions(): Promise<ListEmpresasOptionsResponse> {
  const body = await apiRequest<unknown>('/api/mobile/v1/empresas');
  return ListEmpresasOptionsResponseSchema.parse(body);
}

export async function crearUsuario(input: CreateUsuarioRequest): Promise<CreateUsuarioResponse> {
  const payload = CreateUsuarioRequestSchema.parse(input);
  const body = await apiRequest<unknown>('/api/mobile/v1/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CreateUsuarioResponseSchema.parse(body);
}

export async function eliminarUsuario(id: string): Promise<EliminarUsuarioResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/usuarios/${id}`, { method: 'DELETE' });
  return EliminarUsuarioResponseSchema.parse(body);
}

export async function resetPassword(id: string, password: string): Promise<AdminTargetResponse> {
  const payload = ResetPasswordAdminRequestSchema.parse({ password });
  const body = await apiRequest<unknown>(`/api/mobile/v1/usuarios/${id}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return AdminTargetResponseSchema.parse(body);
}

export async function updateEmailAdmin(id: string, email: string): Promise<UpdateEmailAdminResponse> {
  const payload = UpdateEmailAdminRequestSchema.parse({ email });
  const body = await apiRequest<unknown>(`/api/mobile/v1/usuarios/${id}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return UpdateEmailAdminResponseSchema.parse(body);
}

export async function updateDniAdmin(id: string, dni: string): Promise<UpdateDniAdminResponse> {
  const payload = UpdateDniAdminRequestSchema.parse({ dni });
  const body = await apiRequest<unknown>(`/api/mobile/v1/usuarios/${id}/dni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return UpdateDniAdminResponseSchema.parse(body);
}

export async function updateEstado(id: string, accion: 'baja' | 'reactivar'): Promise<UpdateEstadoResponse> {
  const payload = UpdateEstadoRequestSchema.parse({ accion });
  const body = await apiRequest<unknown>(`/api/mobile/v1/usuarios/${id}/estado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return UpdateEstadoResponseSchema.parse(body);
}

export async function cambiarEmpresaUsuario(id: string, empresaId: string): Promise<CambiarEmpresaUsuarioResponse> {
  const payload = CambiarEmpresaUsuarioRequestSchema.parse({ empresaId });
  const body = await apiRequest<unknown>(`/api/mobile/v1/usuarios/${id}/empresa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CambiarEmpresaUsuarioResponseSchema.parse(body);
}

export async function crearContrato(input: CrearContratoRequest): Promise<CrearContratoResponse> {
  const payload = CrearContratoRequestSchema.parse(input);
  const body = await apiRequest<unknown>('/api/mobile/v1/contratos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CrearContratoResponseSchema.parse(body);
}
