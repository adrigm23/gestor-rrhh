import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/api/usuario";
import { profileQueryKey } from "./use-profile";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) => {
      if (result.outcome === "ok") {
        queryClient.setQueryData(profileQueryKey, result.profile);
      }
    },
  });
}
