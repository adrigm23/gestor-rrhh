import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RespondModificacionFichajeRequest } from "@gestor-rrhh/shared";
import { respondModificacionFichaje } from "@/api/modificaciones-fichaje";
import { modificacionesFichajeQueryKey } from "./use-modificaciones-fichaje";
import { fichajeStatusQueryKey } from "./use-fichaje-status";

type RespondInput = { id: string } & RespondModificacionFichajeRequest;

export function useRespondModificacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accion }: RespondInput) => respondModificacionFichaje(id, { accion }),
    onSuccess: (result) => {
      if (result.outcome === "ok") {
        queryClient.invalidateQueries({ queryKey: modificacionesFichajeQueryKey });
        // Aceptar puede crear/editar un fichaje propio (misma consecuencia
        // que responderSolicitudModificacion en la web) — invalida también
        // el estado de fichaje para que el widget principal se refresque.
        queryClient.invalidateQueries({ queryKey: fichajeStatusQueryKey });
      }
    },
  });
}
