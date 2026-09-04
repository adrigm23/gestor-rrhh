import {
  CrearExportacionRequestSchema,
  CrearExportacionResponseSchema,
  ExportacionStatusResponseSchema,
  ListEmpleadosPorEmpresaResponseSchema,
  ListFichajesEmpresaResponseSchema,
  type CrearExportacionRequest,
  type CrearExportacionResponse,
  type ExportacionStatusResponse,
  type ListEmpleadosPorEmpresaResponse,
  type ListFichajesEmpresaResponse,
} from '@gestor-rrhh/shared';
import { apiRequest } from './client';

export type FichajesEmpresaFilters = {
  empresaId?: string;
  empleadoId?: string;
  estado?: 'abierto' | 'cerrado' | 'todos';
  tipo?: 'JORNADA' | 'PAUSA_COMIDA' | 'DESCANSO' | 'MEDICO' | 'todos';
  from?: string;
  to?: string;
};

function buildQuery(filters: FichajesEmpresaFilters): string {
  const params = new URLSearchParams();
  if (filters.empresaId) params.set('empresaId', filters.empresaId);
  if (filters.empleadoId) params.set('empleadoId', filters.empleadoId);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listFichajesEmpresa(filters: FichajesEmpresaFilters): Promise<ListFichajesEmpresaResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/fichajes-empresa${buildQuery(filters)}`);
  return ListFichajesEmpresaResponseSchema.parse(body);
}

export async function listEmpleadosPorEmpresa(empresaId: string): Promise<ListEmpleadosPorEmpresaResponse> {
  const qs = empresaId ? `?empresaId=${encodeURIComponent(empresaId)}` : '';
  const body = await apiRequest<unknown>(`/api/mobile/v1/fichajes-empresa/empleados${qs}`);
  return ListEmpleadosPorEmpresaResponseSchema.parse(body);
}

export async function crearExportacion(input: CrearExportacionRequest): Promise<CrearExportacionResponse> {
  const payload = CrearExportacionRequestSchema.parse(input);
  const body = await apiRequest<unknown>('/api/mobile/v1/exportaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return CrearExportacionResponseSchema.parse(body);
}

export async function obtenerExportacion(jobId: string): Promise<ExportacionStatusResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/exportaciones/${jobId}`);
  return ExportacionStatusResponseSchema.parse(body);
}
