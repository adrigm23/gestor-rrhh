import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { comparePassword } from "../../../app/utils/password";
import { prisma } from "../../../app/lib/prisma";
import { hashNfcUid, sanitizeNfcUid } from "../../../app/utils/nfc";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

const isLoginBlocked = async (key: string) => {
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

const recordLoginAttempt = async (key: string, success: boolean) => {
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = normalizeEmail(credentials.email as string);
        if (await isLoginBlocked(email)) {
          await sleep(600);
          return null;
        }

        const user = await prisma.usuario.findUnique({
          where: { email },
        });

        if (!user || !user.password || user.activo === false) {
          await recordLoginAttempt(email, false);
          await sleep(600);
          return null;
        }

        const isPasswordCorrect = await comparePassword(
          credentials.password as string,
          user.password,
        );

        if (!isPasswordCorrect) {
          await recordLoginAttempt(email, false);
          await sleep(600);
          return null;
        }

        await recordLoginAttempt(email, true);
        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          role: user.rol,
          empresaId: user.empresaId ?? null,
          passwordMustChange: user.passwordMustChange ?? false,
        };
      },
    }),
    Credentials({
      id: "nfc",
      name: "Tarjeta NFC",
      credentials: {
        uid: { label: "UID", type: "text" },
      },
      async authorize(credentials) {
        const uidRaw = credentials?.uid?.toString() ?? "";
        const uid = sanitizeNfcUid(uidRaw);

        if (!uid) return null;

        const uidHash = hashNfcUid(uid);
        const key = `nfc:${uidHash}`;
        if (await isLoginBlocked(key)) {
          await sleep(600);
          return null;
        }

        const user = await prisma.usuario.findFirst({
          where: { nfcUidHash: uidHash },
        });

        if (!user || user.activo === false) {
          await recordLoginAttempt(key, false);
          await sleep(600);
          return null;
        }

        await recordLoginAttempt(key, true);
        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          role: user.rol,
          empresaId: user.empresaId ?? null,
          passwordMustChange: user.passwordMustChange ?? false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (typeof user.id === "string") {
          token.id = user.id;
        }
        if (typeof user.role === "string") {
          token.role = user.role;
        }
        token.empresaId =
          typeof user.empresaId === "string" || user.empresaId === null
            ? user.empresaId
            : null;
        token.passwordMustChange =
          typeof user.passwordMustChange === "boolean"
            ? user.passwordMustChange
            : false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const userId =
          (typeof token.id === "string" ? token.id : undefined) ??
          (typeof token.sub === "string" ? token.sub : undefined);
        const tokenRole =
          typeof token.role === "string" ? token.role : undefined;
        const tokenEmpresaId =
          typeof token.empresaId === "string" || token.empresaId === null
            ? token.empresaId
            : null;
        const tokenPasswordMustChange =
          typeof token.passwordMustChange === "boolean"
            ? token.passwordMustChange
            : false;

        if (userId) {
          session.user.id = userId;
        }
        session.user.role = tokenRole;
        session.user.empresaId = tokenEmpresaId;
        if (userId) {
          try {
            const dbUser = await prisma.usuario.findUnique({
              where: { id: userId },
              select: { passwordMustChange: true },
            });
            session.user.passwordMustChange = dbUser?.passwordMustChange ?? false;
          } catch {
            session.user.passwordMustChange = tokenPasswordMustChange;
          }
        } else {
          session.user.passwordMustChange = tokenPasswordMustChange;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.AUTH_SECRET,
});
