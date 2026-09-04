import { Redis } from "@upstash/redis";
import type { RateLimitResult, RateLimitService } from "./types";

/**
 * Auditoría de seguridad (Fase 2.19, hallazgo #4): implementación respaldada
 * en Upstash Redis (API REST, sin conexión TCP persistente — encaja con el
 * resto de la app, que ya asume entorno serverless con un solo pool de
 * conexión a Postgres; ver prisma.ts). Sustituye a InMemoryRateLimitService
 * SOLO cuando las credenciales están configuradas (ver index.ts) — así que
 * activarlo es tan simple como añadir dos variables de entorno, sin tocar
 * ningún llamador.
 *
 * Ventana fija implementada con INCR + EXPIRE atómicos vía pipeline: la
 * primera petición de la ventana fija el TTL de la clave; las siguientes
 * solo incrementan. Esto sí es un límite global real entre instancias
 * (a diferencia del Map en memoria), porque el contador vive en Redis, no en
 * el proceso de cada función serverless.
 */
export class RedisRateLimitService implements RateLimitService {
  constructor(private readonly redis: Redis) {}

  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    // INCR crea la clave a 0 e incrementa atómicamente si no existía; EXPIRE
    // con NX solo fija el TTL la primera vez (si ya tenía uno, no lo toca) —
    // así una petición tardía dentro de la ventana no la alarga sin fin.
    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, windowSeconds, "NX");
    const [count] = (await pipeline.exec()) as [number, unknown];

    if (count > limit) {
      const ttl = await this.redis.ttl(redisKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    }

    return { allowed: true, remaining: Math.max(0, limit - count) };
  }
}

export const buildRedisRateLimitService = (): RedisRateLimitService | null => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  return new RedisRateLimitService(new Redis({ url, token }));
};
