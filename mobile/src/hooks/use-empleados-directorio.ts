import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUsuarioRequest, CrearContratoRequest } from '@gestor-rrhh/shared';
import {
  cambiarEmpresaUsuario,
  crearContrato,
  crearUsuario,
  eliminarUsuario,
  getEmpleadoDetail,
  listDepartamentosOptions,
  listDirectory,
  listEmpresasOptions,
  resetPassword,
  updateDniAdmin,
  updateEmailAdmin,
  updateEstado,
  type DirectoryFilters,
} from '@/api/empleados-directorio';

export const directoryQueryKey = (filters: DirectoryFilters) => ['directorio', filters] as const;
export const empleadoDetailQueryKey = (id: string) => ['directorio', 'detalle', id] as const;
export const departamentosOptionsQueryKey = ['departamentos', 'opciones'] as const;
export const empresasOptionsQueryKey = ['empresas', 'opciones'] as const;

export function useDirectory(filters: DirectoryFilters) {
  return useQuery({
    queryKey: directoryQueryKey(filters),
    queryFn: () => listDirectory(filters),
    staleTime: 30_000,
  });
}

export function useEmpleadoDetail(id: string | null) {
  return useQuery({
    queryKey: empleadoDetailQueryKey(id ?? ''),
    queryFn: () => getEmpleadoDetail(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useDepartamentosOptions() {
  return useQuery({
    queryKey: departamentosOptionsQueryKey,
    queryFn: listDepartamentosOptions,
    staleTime: 60_000,
  });
}

export function useEmpresasOptions() {
  return useQuery({
    queryKey: empresasOptionsQueryKey,
    queryFn: listEmpresasOptions,
    staleTime: 60_000,
  });
}

export function useCrearUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUsuarioRequest) => crearUsuario(input),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['directorio'] });
      }
    },
  });
}

// Invalida tanto el listado como el detalle del empleado afectado: las
// mutaciones de esta pantalla se lanzan siempre desde la ficha de detalle,
// así que ambos quedan desactualizados a la vez.
function useEmpleadoMutation<TInput, TResult extends { outcome: string }>(
  mutationFn: (input: TInput) => Promise<TResult>,
  empleadoId: (input: TInput) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, input) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['directorio'] });
        queryClient.invalidateQueries({ queryKey: empleadoDetailQueryKey(empleadoId(input)) });
      }
    },
  });
}

export function useResetPassword() {
  return useEmpleadoMutation(
    ({ id, password }: { id: string; password: string }) => resetPassword(id, password),
    (input) => input.id,
  );
}

export function useUpdateEmailAdmin() {
  return useEmpleadoMutation(
    ({ id, email }: { id: string; email: string }) => updateEmailAdmin(id, email),
    (input) => input.id,
  );
}

export function useUpdateDniAdmin() {
  return useEmpleadoMutation(
    ({ id, dni }: { id: string; dni: string }) => updateDniAdmin(id, dni),
    (input) => input.id,
  );
}

export function useUpdateEstado() {
  return useEmpleadoMutation(
    ({ id, accion }: { id: string; accion: 'baja' | 'reactivar' }) => updateEstado(id, accion),
    (input) => input.id,
  );
}

export function useCambiarEmpresaUsuario() {
  return useEmpleadoMutation(
    ({ id, empresaId }: { id: string; empresaId: string }) => cambiarEmpresaUsuario(id, empresaId),
    (input) => input.id,
  );
}

export function useCrearContrato() {
  return useEmpleadoMutation(
    (input: CrearContratoRequest) => crearContrato(input),
    (input) => input.empleadoId,
  );
}

export function useEliminarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarUsuario(id),
    onSuccess: (result) => {
      if (result.outcome === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['directorio'] });
      }
    },
  });
}
