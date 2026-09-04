export * from "./types";
export { InMemoryRateLimitService } from "./service";
export { RedisRateLimitService } from "./redis-service";

import { InMemoryRateLimitService } from "./service";
import { buildRedisRateLimitService } from "./redis-service";
import type { RateLimitService } from "./types";

// Auditoría de seguridad (Fase 2.19, hallazgo #4): si UPSTASH_REDIS_REST_URL
// y _TOKEN están configuradas, el límite es real y global entre instancias;
// si no, se mantiene el comportamiento "best effort" en memoria de siempre
// (documentado en service.ts) — nunca falla el arranque por no tener Redis
// configurado, así que activar esto es solo añadir las dos variables.
const redisService = buildRedisRateLimitService();
if (redisService) {
  console.log("[rate-limit] Usando backend Redis (Upstash).");
} else {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/_TOKEN no configuradas — usando backend en memoria (no válido entre instancias serverless).",
  );
}

export const rateLimitService: RateLimitService = redisService ?? new InMemoryRateLimitService();
