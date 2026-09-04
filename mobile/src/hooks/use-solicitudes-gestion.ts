import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateSolicitudEstadoRequest } from "@gestor-rrhh/shared";
import {
  listSolicitudesHistorialGestion,
  listSolicitudesPendientes,
  updateSolicitudEstado,
} from "@/api/solicitudes-gestion";

export const solicitudesPendientesQueryKey = ["solicitudes", "pendientes"] as const;
export const solicitudesHistorialGestionQueryKey = ["solicitudes", "historial-gestion"] as const;

export function useSolicitudesPendientes() {
  return useQuery({
    queryKey: solicitudesPendientesQueryKey,
    queryFn: listSolicitudesPendientes,
    staleTime: 30_000,
  });
}

export function useSolicitudesHistorialGestion() {
  return useQuery({
    queryKey: solicitudesHistorialGestionQueryKey,
    queryFn: listSolicitudesHistorialGestion,
    staleTime: 30_000,
  });
}

type UpdateInput = { id: string } & UpdateSolicitudEstadoRequest;

export function useUpdateSolicitudEstado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: UpdateInput) => updateSolicitudEstado(id, { estado }),
    onSuccess: (result) => {
      if (result.outcome === "ok") {
        queryClient.invalidateQueries({ queryKey: solicitudesPendientesQueryKey });
        queryClient.invalidateQueries({ queryKey: solicitudesHistorialGestionQueryKey });
      }
    },
  });
}
