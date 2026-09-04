import { useMutation, useQuery } from '@tanstack/react-query';
import type { CrearExportacionRequest } from '@gestor-rrhh/shared';
import {
  crearExportacion,
  listEmpleadosPorEmpresa,
  listFichajesEmpresa,
  obtenerExportacion,
  type FichajesEmpresaFilters,
} from '@/api/fichajes-empresa';

export const fichajesEmpresaQueryKey = (filters: FichajesEmpresaFilters) => ['fichajes-empresa', filters] as const;
export const empleadosPorEmpresaQueryKey = (empresaId: string) => ['fichajes-empresa', 'empleados', empresaId] as const;

export function useFichajesEmpresa(filters: FichajesEmpresaFilters) {
  return useQuery({
    queryKey: fichajesEmpresaQueryKey(filters),
    queryFn: () => listFichajesEmpresa(filters),
    staleTime: 30_000,
  });
}

// `enabled` es explícito (no se deriva de empresaId) porque GERENTE nunca
// necesita elegir empresa: el backend ignora el valor recibido y resuelve
// siempre la suya, así que la pantalla activa la consulta directamente
// para GERENTE sin esperar a una selección.
export function useEmpleadosPorEmpresa(empresaId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: empleadosPorEmpresaQueryKey(empresaId ?? ''),
    queryFn: () => listEmpleadosPorEmpresa(empresaId ?? ''),
    enabled,
    staleTime: 60_000,
  });
}

export function useCrearExportacion() {
  return useMutation({
    mutationFn: (input: CrearExportacionRequest) => crearExportacion(input),
  });
}

const POLL_INTERVAL_MS = 4000;

// Polling del estado del job: se detiene solo al llegar a LISTO o ERROR,
// igual que ExportAsyncPanel en la web (pollIntervalMs = 4000).
export function useExportacionStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['exportacion', jobId ?? ''],
    queryFn: () => obtenerExportacion(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'LISTO' || status === 'ERROR' ? false : POLL_INTERVAL_MS;
    },
  });
}
