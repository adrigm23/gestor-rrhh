import { useMutation, useQueryClient } from "@tanstack/react-query";
import { togglePausa } from "@/api/fichajes";
import { NetworkError } from "@/api/errors";
import { useOfflineQueueStore } from "@/store/offline-queue-store";
import { fichajeStatusQueryKey } from "./use-fichaje-status";

export function useTogglePausa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: togglePausa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fichajeStatusQueryKey });
    },
    onError: (error) => {
      if (error instanceof NetworkError) {
        void useOfflineQueueStore.getState().enqueue("togglePausa");
      }
    },
  });
}
