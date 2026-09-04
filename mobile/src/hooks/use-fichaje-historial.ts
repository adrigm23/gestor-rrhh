import { useQuery } from "@tanstack/react-query";
import { getFichajeHistorial } from "@/api/fichajes";

export const fichajeHistorialQueryKey = ["fichaje", "historial"] as const;

export function useFichajeHistorial() {
  return useQuery({
    queryKey: fichajeHistorialQueryKey,
    queryFn: getFichajeHistorial,
    staleTime: 30_000,
  });
}
