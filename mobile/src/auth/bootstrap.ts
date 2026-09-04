import { refresh } from "../api/auth";
import { NetworkError } from "../api/errors";
import { clearTokens, loadTokens, saveTokens } from "./token-manager";
import type { AuthUser } from "../types/auth";

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Decodificador base64url manual: ni Hermes ni React Native garantizan
// `atob`/`Buffer` como globales, así que se evita depender de ninguno de
// los dos. Solo se usa sobre el payload del access token (claims ASCII:
// sub/role/empresaId/passwordMustChange/type/iat/exp/jti), no como decoder
// base64 de propósito general.
function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

// Lee los claims del access token para reconstruir `user` sin otra llamada
// de red tras un refresh. No verifica la firma: no es una decisión de
// seguridad (el servidor sigue verificando cada petición real), solo lectura
// de datos para poblar el estado local.
function decodeAccessTokenUser(accessToken: string): AuthUser | null {
  try {
    const payloadSegment = accessToken.split(".")[1];
    if (!payloadSegment) return null;

    const payload = JSON.parse(decodeBase64Url(payloadSegment));

    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.passwordMustChange !== "boolean"
    ) {
      return null;
    }

    return {
      id: payload.sub,
      role: payload.role,
      empresaId: typeof payload.empresaId === "string" ? payload.empresaId : null,
      passwordMustChange: payload.passwordMustChange,
    };
  } catch {
    return null;
  }
}

export interface BootstrapResult {
  authenticated: boolean;
  user: AuthUser | null;
}

export async function bootstrapSession(): Promise<BootstrapResult> {
  try {
    const tokens = await loadTokens();
    if (!tokens) {
      return { authenticated: false, user: null };
    }

    const refreshed = await refresh(tokens.refreshToken);
    const user = decodeAccessTokenUser(refreshed.accessToken);

    if (!user) {
      await clearTokens();
      return { authenticated: false, user: null };
    }

    await saveTokens(refreshed);
    return { authenticated: true, user };
  } catch (error) {
    if (error instanceof NetworkError) {
      // Sin conexión: no se puede confirmar ni descartar la sesión. Los
      // tokens guardados se conservan intactos para el próximo intento con
      // red — "no puedo comprobarlo ahora" no es lo mismo que "caducó".
      return { authenticated: false, user: null };
    }
    await clearTokens();
    return { authenticated: false, user: null };
  }
}
