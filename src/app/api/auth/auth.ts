import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../../../app/lib/prisma";
import { hashNfcUid, sanitizeNfcUid } from "../../../app/utils/nfc";
import { sanitizeString } from "../../../app/utils/input";
import { getClientIp } from "../../../app/lib/client-ip";
import { authService } from "../../../services/auth";
import { isLoginBlocked, recordLoginAttempt } from "../../../services/auth/login-throttle";

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Auditoría de seguridad (Fase 2.19, hallazgo #9): verifyCredentials
        // ya bloquea por email (LoginThrottle), pero eso no frena un ataque
        // de "password spraying" — muchas cuentas distintas, pocos intentos
        // por cuenta, desde una misma IP. Este límite por IP es independiente
        // y usa el mismo LoginThrottle (respaldado en BD, no en memoria, así
        // que sí sobrevive a cold starts serverless).
        const ipKey = `login:ip:${getClientIp(request.headers)}`;
        if (await isLoginBlocked(ipKey)) {
          return null;
        }

        const result = await authService.verifyCredentials(
          credentials.email as string,
          credentials.password as string,
        );

        await recordLoginAttempt(ipKey, result.outcome === "ok");

        if (result.outcome !== "ok") return null;

        return {
          id: result.user.userId,
          name: result.user.nombre,
          email: result.user.email,
          role: result.user.role,
          empresaId: result.user.empresaId,
          passwordMustChange: result.user.passwordMustChange,
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
        const uidRaw = sanitizeString(credentials?.uid, { maxLength: 128 });
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
