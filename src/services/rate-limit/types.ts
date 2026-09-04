export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Contrato de dominio, independiente de Next.js, HTTP y del almacenamiento
 * concreto. Recibe datos ya resueltos por el llamador (clave, límite,
 * ventana) y nunca lanza excepciones para un bloqueo esperado: un límite
 * superado es un resultado (`allowed: false`), no un error.
 */
export interface RateLimitService {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}
