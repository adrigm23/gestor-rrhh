import { createHash } from "node:crypto";

/**
 * SHA-256 de un refresh token, usado como clave tanto para su persistencia
 * en MobileSession como para el rate limiting por token (Fase 1.5). Nunca
 * se guarda ni se transmite el token en claro.
 */
export const hashRefreshToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
