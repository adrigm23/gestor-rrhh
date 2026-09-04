import { useQuery } from "@tanstack/react-query";
import { listSolicitudes } from "@/api/solicitudes";

export const solicitudesQueryKey = ["solicitudes"] as const;

export function useSolicitudes() {
  return useQuery({
    queryKey: solicitudesQueryKey,
    queryFn: listSolicitudes,
    staleTime: 30_000,
  });
}
