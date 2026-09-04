import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateModificacionFichajeRequest } from "@gestor-rrhh/shared";
import {
  createModificacionFichaje,
  listEmpleados,
  listFichajesForEmpleado,
  listModificacionesGestion,
} from "@/api/modificacion-gestion";

export const empleadosQueryKey = ["empleados"] as const;
export const modificacionesGestionQueryKey = ["modificaciones-fichaje", "gestion"] as const;
export const fichajesEmpleadoQueryKey = (empleadoId: string) => ["fichajes-empleado", empleadoId] as const;

export function useEmpleados() {
  return useQuery({
    queryKey: empleadosQueryKey,
    queryFn: listEmpleados,
    staleTime: 60_000,
  });
}

export function useFichajesEmpleado(empleadoId: string | null) {
  return useQuery({
    queryKey: fichajesEmpleadoQueryKey(empleadoId ?? ""),
    queryFn: () => listFichajesForEmpleado(empleadoId as string),
    enabled: Boolean(empleadoId),
    staleTime: 30_000,
  });
}

export function useModificacionesGestion() {
  return useQuery({
    queryKey: modificacionesGestionQueryKey,
    queryFn: listModificacionesGestion,
    staleTime: 30_000,
  });
}

export function useCreateModificacionFichaje() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModificacionFichajeRequest) => createModificacionFichaje(input),
    onSuccess: (result) => {
      if (result.outcome === "ok") {
        queryClient.invalidateQueries({ queryKey: modificacionesGestionQueryKey });
      }
    },
  });
}
