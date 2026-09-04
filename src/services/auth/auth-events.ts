export type AuthEventName =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_REFRESH_SUCCESS"
  | "AUTH_REFRESH_REUSE_DETECTED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_LOGOUT"
  | "AUTH_REVOKE_ALL";

export interface AuthEventFields {
  userId?: string;
  sessionId?: string;
  reason?: string;
  /** Solo para AUTH_LOGIN_FAILED, cuando no hay userId resuelto todavía. */
  email?: string;
}

/**
 * Observabilidad estructurada de autenticación. Nunca lanza (la propia
 * observabilidad no debe poder romper un flujo de auth), nunca incluye
 * tokens, hashes completos ni contraseñas — solo identificadores y motivos.
 */
export function logAuthEvent(event: AuthEventName, fields: AuthEventFields = {}): void {
  try {
    console.log(
      JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...fields,
      }),
    );
  } catch {
    // La observabilidad nunca debe romper el flujo de autenticación.
  }
}
