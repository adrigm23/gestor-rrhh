import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/api/usuario";

export const profileQueryKey = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: getProfile,
    staleTime: 30_000,
  });
}
