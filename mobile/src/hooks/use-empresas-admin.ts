import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActualizarConfigEmpresaRequest, CrearEmpresaRequest } from '@gestor-rrhh/shared';
import {
  actualizarConfigEmpresa,
  crearEmpresaAdmin,
  eliminarEmpresaAdmin,
  listEmpresasAdmin,
} from '@/api/empresas-admin';
import { getMiEmpresaConfig } from '@/api/mi-empresa';

export const empresasAdminQueryKey = ['empresas-admin'] as const;
export const miEmpresaConfigQueryKey = ['mi-empresa', 'config'] as const;

// Config de la propia empresa (GERENTE sobre la suya, Fase 2.17 — corrige
// la regresión de la 2.16: dashboard/ajustes expone estos mismos toggles
// a GERENTE, no solo a ADMIN_SISTEMA desde dashboard/empresas).
//
// `enabled` debe reflejar exactamente la misma condición de rol que decide
// si la sección se pinta en pantalla (isGerente en perfil.tsx) — el backend
// devuelve 401 "unauthorized" (no 403) para cualquier rol que no sea
// GERENTE/ADMIN_SISTEMA, y el cliente HTTP trata todo 401 como sesión
// caducada: sin este gate, un EMPLEADO abriendo Perfil dispara la query
// igualmente, TanStack Query la reintenta varias veces, y cada intento
// fallido consume una rotación de refresh token real hasta agotar el
// rate-limit de /auth/refresh (encontrado en vivo probando esta pantalla).
export function useMiEmpresaConfig(enabled = true) {
  return useQuery({
    queryKey: miEmpresaConfigQueryKey,
    queryFn: getMiEmpresaConfig,
    staleTime: 30_000,
    enabled,
  });
}

export function useEmpresasAdmin() {
  return useQuery({
    queryKey: empresasAdminQueryKey,
    queryFn: listEmpresasAdmin,
    staleTime: 30_000,
  });
}

export function useCrearEmpresaAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearEmpresaRequest) => crearEmpresaAdmin(input),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: empresasAdminQueryKey });
      }
    },
  });
}

export function useEliminarEmpresaAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarEmpresaAdmin(id),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: empresasAdminQueryKey });
      }
    },
  });
}

export function useActualizarConfigEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActualizarConfigEmpresaRequest }) =>
      actualizarConfigEmpresa(id, input),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: empresasAdminQueryKey });
        queryClient.invalidateQueries({ queryKey: miEmpresaConfigQueryKey });
      }
    },
  });
}
