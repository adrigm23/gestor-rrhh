import {
  LoginRequestSchema,
  LoginResponseSchema,
  RefreshResponseSchema,
  LogoutResponseSchema,
  type LoginRequest,
  type LoginResponse,
  type RefreshResponse,
  type LogoutResponse,
} from "@gestor-rrhh/shared";
import { BASE_URL } from "./base-url";
import { ApiError, NetworkError } from "./errors";

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const body = LoginRequestSchema.parse(credentials);

  const res = await fetch(`${BASE_URL}/api/mobile/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return LoginResponseSchema.parse(await res.json());
}

async function performRefresh(refreshToken: string): Promise<RefreshResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/mobile/v1/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
  } catch (error) {
    // El fetch no llegó a completarse (sin conexión, DNS, timeout...) — esto
    // nunca debe confundirse con un rechazo real del servidor.
    throw new NetworkError("No se pudo conectar con el servidor durante el refresh", {
      cause: error,
    });
  }

  if (!res.ok) {
    throw new ApiError(res.status, `Refresh fallido con estado ${res.status}`);
  }

  return RefreshResponseSchema.parse(await res.json());
}

// Deduplicación: si hay un refresh en curso, cualquier llamador adicional
// espera y reutiliza el mismo resultado en vez de disparar otro refresh.
let refreshInFlight: Promise<RefreshResponse> | null = null;

export function refresh(refreshToken: string): Promise<RefreshResponse> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function logout(refreshToken: string): Promise<LogoutResponse> {
  const res = await fetch(`${BASE_URL}/api/mobile/v1/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  return LogoutResponseSchema.parse(await res.json());
}
