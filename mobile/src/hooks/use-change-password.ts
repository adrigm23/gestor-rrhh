import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/api/usuario";

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}
