import type { RateLimitResult, RateLimitService } from "./types";

interface Bucket {
  count: number;
  resetAt: number;
}

const CLEANUP_PROBABILITY = 0.02;

/**
 * Contador de ventana fija en memoria del proceso.
 *
 * LIMITACIÓN CONOCIDA: en un entorno serverless (Vercel) cada instancia de
 * función tiene su propia memoria. Con varias instancias concurrentes o tras
 * un cold start, este contador NO ofrece un límite global estricto — cada
 * instancia cuenta por separado, así que el límite efectivo real puede ser
 * mayor que el nominal ante tráfico distribuido. Es una protección "best
 * effort" válida para esta fase (y exacta en desarrollo local con una sola
 * instancia), no una garantía dura.
 *
 * El contrato `RateLimitService` está preparado para sustituir esta clase
 * por una respaldada en Redis/Upstash (mismo `check()`, misma forma de
 * resultado) sin tocar ningún llamador.
 */
export class InMemoryRateLimitService implements RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  async check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    this.maybeCleanup();

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: Math.max(0, limit - 1) };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return { allowed: true, remaining: Math.max(0, limit - existing.count) };
  }

  private maybeCleanup() {
    if (Math.random() > CLEANUP_PROBABILITY) return;

    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
