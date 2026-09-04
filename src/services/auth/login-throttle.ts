import { prisma } from "../../app/lib/prisma";

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 5 * 60 * 1000;
const LOGIN_RETENTION_MS = 24 * 60 * 60 * 1000;

const logThrottleError = (scope: string, error: unknown) => {
  console.error(`[Auth throttle] ${scope}:`, error);
};

const maybeCleanupLoginThrottle = () => {
  if (Math.random() > 0.02) return;

  const now = new Date();
  const staleCutoff = new Date(now.getTime() - LOGIN_RETENTION_MS);

  void prisma.loginThrottle
    .deleteMany({
      where: {
        updatedAt: { lt: staleCutoff },
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
      },
    })
    .catch(() => undefined);
};

export const isLoginBlocked = async (key: string) => {
  maybeCleanupLoginThrottle();

  try {
    const now = new Date();
    const entry = await prisma.loginThrottle.findUnique({
      where: { key },
      select: { blockedUntil: true },
    });

    if (!entry?.blockedUntil) return false;

    if (entry.blockedUntil <= now) {
      await prisma.loginThrottle
        .update({
          where: { key },
          data: {
            attempts: 0,
            firstAttemptAt: null,
            blockedUntil: null,
          },
        })
        .catch(() => undefined);
      return false;
    }

    return true;
  } catch (error) {
    logThrottleError("isLoginBlocked", error);
    return false;
  }
};

const resetLoginAttempts = async (key: string) => {
  await prisma.loginThrottle.delete({ where: { key } }).catch(() => undefined);
};

const recordFailedLoginAttempt = async (key: string) => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);

  await prisma.$transaction(async (tx) => {
    const current = await tx.loginThrottle.findUnique({
      where: { key },
      select: { attempts: true, firstAttemptAt: true, blockedUntil: true },
    });

    if (!current) {
      await tx.loginThrottle.create({
        data: {
          key,
          attempts: 1,
          firstAttemptAt: now,
        },
      });
      return;
    }

    const windowExpired =
      !current.firstAttemptAt || current.firstAttemptAt < windowStart;

    if (windowExpired) {
      await tx.loginThrottle.update({
        where: { key },
        data: {
          attempts: 1,
          firstAttemptAt: now,
          blockedUntil: null,
        },
      });
      return;
    }

    const updated = await tx.loginThrottle.update({
      where: { key },
      data: { attempts: { increment: 1 } },
      select: { attempts: true, blockedUntil: true },
    });

    const alreadyBlocked =
      updated.blockedUntil !== null && updated.blockedUntil > now;

    if (!alreadyBlocked && updated.attempts >= LOGIN_MAX_ATTEMPTS) {
      await tx.loginThrottle.update({
        where: { key },
        data: {
          blockedUntil: new Date(now.getTime() + LOGIN_BLOCK_MS),
        },
      });
    }
  });
};

export const recordLoginAttempt = async (key: string, success: boolean) => {
  try {
    if (success) {
      await resetLoginAttempts(key);
      return;
    }

    await recordFailedLoginAttempt(key);
  } catch (error) {
    logThrottleError("recordLoginAttempt", error);
  }
};
