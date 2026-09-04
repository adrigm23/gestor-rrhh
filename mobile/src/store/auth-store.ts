import { create } from "zustand";
import { login as loginRequest, logout as logoutRequest } from "../api/auth";
import { setSessionExpiredHandler } from "../api/client";
import { bootstrapSession } from "../auth/bootstrap";
import { clearTokens, loadTokens, saveTokens } from "../auth/token-manager";
import { queryClient } from "../lib/query-client";
import type { AuthStore } from "../types/auth";

export const useAuthStore = create<AuthStore>((set) => ({
  loading: true,
  authenticated: false,
  user: null,

  restore: async () => {
    set({ loading: true });
    try {
      const result = await bootstrapSession();
      set({ loading: false, authenticated: result.authenticated, user: result.user });
    } catch {
      set({ loading: false, authenticated: false, user: null });
    }
  },

  login: async (email, password) => {
    const result = await loginRequest({ email, password });

    if (result.outcome !== "ok") {
      return result.outcome;
    }

    await saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    set({ authenticated: true, user: result.user });
    return result.outcome;
  },

  logout: async () => {
    const tokens = await loadTokens();
    if (tokens) {
      await logoutRequest(tokens.refreshToken).catch(() => undefined);
    }
    await clearTokens();
    // Sin esto, cambiar de cuenta sin recargar la app (logout -> login)
    // podía mostrar brevemente datos cacheados de la sesión anterior
    // (fichajes, perfil, solicitudes...) hasta que cada query refrescara
    // por su cuenta.
    queryClient.clear();
    set({ authenticated: false, user: null });
  },
}));

// client.ts no conoce el store; aquí es donde el store se registra a sí
// mismo como el handler que limpia la sesión cuando un refresh irrecuperable
// lo notifica.
setSessionExpiredHandler(() => {
  void useAuthStore.getState().logout();
});
