import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSolicitud } from "@/api/solicitudes";
import { solicitudesQueryKey } from "./use-solicitudes";

// A diferencia de toggleFichaje/togglePausa (Fase 2.4b/c), crear una
// solicitud NO se encola offline: la comprobación de solape depende del
// estado de otras solicitudes en el momento del envío, así que reproducir
// la petición más tarde sin repetir esa comprobación podría crear una
// solicitud inválida. Si falla la red, se propaga el error tal cual y el
// usuario reintenta manualmente.
export function useCreateSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSolicitud,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitudesQueryKey });
      // La pantalla Calendario (Fase 2.17) pinta días de vacaciones/
      // ausencias a partir de su propia consulta por rango — sin esto se
      // quedaría desactualizada tras crear una solicitud desde allí.
      queryClient.invalidateQueries({ queryKey: ['calendario'] });
    },
  });
}
