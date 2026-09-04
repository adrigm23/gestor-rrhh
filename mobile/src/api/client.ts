import { refresh as refreshTokens } from "./auth";
import { BASE_URL } from "./base-url";
import { ApiError, NetworkError } from "./errors";
import { loadTokens, saveTokens } from "../auth/token-manager";

// Igual que performRefresh en api/auth.ts: si el propio fetch no llega a
// completarse, es NetworkError, nunca una respuesta real del servidor. Esto
// es lo que permite a la cola offline (offline/queue.ts) decidir con
// fiabilidad si una acción falló por falta de red o por otra cosa.
async function performRequest(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  try {
    return await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new NetworkError("No se pudo conectar con el servidor", { cause: error });
  }
}

// El cliente HTTP no conoce el store: solo avisa de que la sesión murió a
// través de este callback, registrado externamente (ver auth-store.ts). Así
// client.ts no depende de Zustand ni de la forma del store, y podría
// testearse aislado sin arrastrar ninguno de los dos.
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

/**
 * Cliente autenticado único para endpoints protegidos (fichajes, etc — no se
 * usa todavía en esta fase). Adjunta el access token vigente, y ante un 401
 * ejecuta un único refresh (deduplicado en api/auth.ts) y reintenta una vez;
 * si el refresh falla por un rechazo real del servidor, notifica a
 * onSessionExpired (el store se encarga de limpiar tokens y estado
 * exactamente igual que un logout manual). Si falla por NetworkError (sin
 * conexión), NO se toca la sesión — se propaga el error tal cual para que
 * quien llamó sepa que el problema es de red, no de autenticación.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await loadTokens();
  let response = await performRequest(path, init, tokens?.accessToken ?? null);

  if (response.status === 401 && tokens) {
    try {
      const refreshed = await refreshTokens(tokens.refreshToken);
      await saveTokens(refreshed);
      response = await performRequest(path, init, refreshed.accessToken);
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      // ApiError (401 real u otro estado) o cualquier otro fallo inesperado
      // durante el refresh: se sigue tratando como sesión inválida, igual
      // que antes de distinguir NetworkError.
      onSessionExpired?.();
      throw new Error("Sesión expirada");
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Petición fallida: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
