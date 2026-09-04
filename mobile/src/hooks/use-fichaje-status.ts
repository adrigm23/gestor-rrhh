import { useQuery } from "@tanstack/react-query";
import { getFichajeStatus } from "@/api/fichajes";

export const fichajeStatusQueryKey = ["fichaje", "status"] as const;

export function useFichajeStatus() {
  return useQuery({
    queryKey: fichajeStatusQueryKey,
    queryFn: getFichajeStatus,
    staleTime: 30_000,
  });
}
