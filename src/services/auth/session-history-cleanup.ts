import { prisma } from "../../app/lib/prisma";

const CLEANUP_PROBABILITY = 0.02;

// Duplica intencionadamente el límite absoluto de sesión (90 días, definido
// en service.ts) en vez de importarlo, para que este módulo permanezca
// autocontenido — mismo criterio que ya sigue login-throttle.ts, que no
// importa nada de service.ts tampoco. Si el límite absoluto cambia alguna
// vez, actualizar también aquí.
const MAX_SESSION_LIFETIME_DAYS = 90;
const CLEANUP_GRACE_DAYS = 7;
const CLEANUP_RETENTION_MS =
  (MAX_SESSION_LIFETIME_DAYS + CLEANUP_GRACE_DAYS) * 24 * 60 * 60 * 1000;

/**
 * Limpieza oportunista de MobileSessionTokenHistory (2% de probabilidad por
 * llamada, mismo patrón que maybeCleanupLoginThrottle). Borra únicamente
 * histórico de sesiones ya revocadas hace más de 97 días — nunca toca
 * histórico de una sesión activa (revokedAt IS NULL) ni el de una sesión
 * revocada recientemente, todavía dentro del margen de seguridad.
 */
export const maybeCleanupSessionHistory = () => {
  if (Math.random() > CLEANUP_PROBABILITY) return;

  const cutoff = new Date(Date.now() - CLEANUP_RETENTION_MS);

  void prisma.mobileSessionTokenHistory
    .deleteMany({
      where: {
        session: {
          revokedAt: { not: null, lt: cutoff },
        },
      },
    })
    .catch(() => undefined);
};
