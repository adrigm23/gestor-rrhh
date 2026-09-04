import { tokenStorage } from "../storage/token-storage";
import type { AuthTokens } from "../types/auth";

const ACCESS_TOKEN_KEY = "mobile_access_token";
const REFRESH_TOKEN_KEY = "mobile_refresh_token";

// Espejo en memoria: tokenStorage (SecureStore en nativo, localStorage en
// web — ver ../storage/) es la persistencia real, esto solo evita una
// lectura async en cada llamada a loadTokens() dentro del mismo proceso.
let memo: AuthTokens | null = null;

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  memo = tokens;
  await Promise.all([
    tokenStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    tokenStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  if (memo) {
    return memo;
  }

  const [accessToken, refreshToken] = await Promise.all([
    tokenStorage.getItem(ACCESS_TOKEN_KEY),
    tokenStorage.getItem(REFRESH_TOKEN_KEY),
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  memo = { accessToken, refreshToken };
  return memo;
}

export async function clearTokens(): Promise<void> {
  memo = null;
  await Promise.all([
    tokenStorage.deleteItem(ACCESS_TOKEN_KEY),
    tokenStorage.deleteItem(REFRESH_TOKEN_KEY),
  ]);
}
