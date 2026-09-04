/**
 * Lanzado por AuthService cuando una operación supera su límite de tasa.
 * No contiene información sensible (ni tokens, ni hashes, ni identidad del
 * usuario) — solo cuántos segundos hay que esperar antes de reintentar.
 */
export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
