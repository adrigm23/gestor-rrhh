import { useQuery } from "@tanstack/react-query";
import { getResumenHoras } from "@/api/resumen-horas";

export const resumenHorasQueryKey = (empleadoId: string | null) => ["resumen-horas", empleadoId ?? "self"] as const;

export function useResumenHoras(empleadoId: string | null) {
  return useQuery({
    queryKey: resumenHorasQueryKey(empleadoId),
    queryFn: () => getResumenHoras(empleadoId ?? undefined),
    staleTime: 30_000,
  });
}
