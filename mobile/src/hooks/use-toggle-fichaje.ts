import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleFichaje } from "@/api/fichajes";
import { NetworkError } from "@/api/errors";
import { useOfflineQueueStore } from "@/store/offline-queue-store";
import { fichajeStatusQueryKey } from "./use-fichaje-status";

export function useToggleFichaje() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleFichaje,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fichajeStatusQueryKey });
    },
    onError: (error) => {
      // Un rechazo real del servidor no se encola (reintentarlo no cambiaría
      // el resultado); solo la falta de conexión. Se pasa por el store (no
      // por offline/queue.ts directamente) para que pendingCount se
      // actualice y la UI se entere.
      if (error instanceof NetworkError) {
        void useOfflineQueueStore.getState().enqueue("toggleFichaje");
      }
    },
  });
}
