import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CrearCentroTrabajoRequest, CrearDepartamentoRequest } from '@gestor-rrhh/shared';
import {
  crearCentroTrabajo,
  crearDepartamento,
  listCentros,
  listDepartamentosOrg,
  listGerentesOptions,
  updateCentroDireccion,
} from '@/api/organizacion';
import { empresasOptionsQueryKey } from './use-empleados-directorio';

export const centrosQueryKey = ['organizacion', 'centros'] as const;
export const departamentosOrgQueryKey = ['organizacion', 'departamentos'] as const;
export const gerentesOptionsQueryKey = ['organizacion', 'gerentes'] as const;

export function useCentros() {
  return useQuery({
    queryKey: centrosQueryKey,
    queryFn: listCentros,
    staleTime: 30_000,
  });
}

export function useDepartamentosOrg() {
  return useQuery({
    queryKey: departamentosOrgQueryKey,
    queryFn: listDepartamentosOrg,
    staleTime: 30_000,
  });
}

export function useGerentesOptions() {
  return useQuery({
    queryKey: gerentesOptionsQueryKey,
    queryFn: listGerentesOptions,
    staleTime: 60_000,
  });
}

export function useCrearCentroTrabajo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearCentroTrabajoRequest) => crearCentroTrabajo(input),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: centrosQueryKey });
      }
    },
  });
}

export function useUpdateCentroDireccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direccion }: { id: string; direccion: string }) => updateCentroDireccion(id, direccion),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: centrosQueryKey });
      }
    },
  });
}

export function useCrearDepartamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearDepartamentoRequest) => crearDepartamento(input),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: departamentosOrgQueryKey });
        // Un departamento nuevo puede quedar asociado a un centro de
        // trabajo, lo que cambia su "departamentosCount" — invalidamos
        // también el listado de centros para que no quede desactualizado.
        queryClient.invalidateQueries({ queryKey: centrosQueryKey });
      }
    },
  });
}

// Reutilizado del selector de empresas de la Fase 2.13 (mismo endpoint
// admin-only /api/mobile/v1/empresas); re-exportado aquí por comodidad de
// import en las pantallas de organización.
export { useEmpresasOptions } from './use-empleados-directorio';
export { empresasOptionsQueryKey };
