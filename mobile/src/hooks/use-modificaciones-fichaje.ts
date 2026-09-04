import { useQuery } from "@tanstack/react-query";
import { listModificacionesFichaje } from "@/api/modificaciones-fichaje";

export const modificacionesFichajeQueryKey = ["modificaciones-fichaje"] as const;

export function useModificacionesFichaje() {
  return useQuery({
    queryKey: modificacionesFichajeQueryKey,
    queryFn: listModificacionesFichaje,
    staleTime: 30_000,
  });
}
