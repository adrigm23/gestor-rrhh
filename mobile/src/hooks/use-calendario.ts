import { useQuery } from '@tanstack/react-query';
import { getCalendario } from '@/api/calendario';

export const calendarioQueryKey = (desde: string, hasta: string) => ['calendario', desde, hasta] as const;

// Mismo rango que dashboard/calendario en la web: 3 meses atrás, 4 meses
// adelante desde el mes visible (cubre navegación hacia atrás/adelante sin
// tener que refetchear en cada clic, igual que allí).
export function useCalendario(desde: string, hasta: string) {
  return useQuery({
    queryKey: calendarioQueryKey(desde, hasta),
    queryFn: () => getCalendario(desde, hasta),
    staleTime: 30_000,
  });
}
