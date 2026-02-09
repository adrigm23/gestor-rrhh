// src/app/api/auth/auth.ts (o donde tengas tu archivo auth.ts)
import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { comparePassword } from "../../../app/utils/password"; // Ajusta la ruta según tu estructura
import { prisma } from "../../../app/lib/prisma"; // 👈 IMPORTA LA INSTANCIA GLOBAL
import { hashNfcUid, sanitizeNfcUid } from "../../../app/utils/nfc";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type AttemptEntry = {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
};

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 5 * 60 * 1000;
const loginAttempts = new Map<string, AttemptEntry>();

const isLoginBlocked = (key: string) => {
  const entry = loginAttempts.get(key);
  if (!entry?.blockedUntil) return false;
  if (entry.blockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return false;
  }
  return true;
};

const recordLoginAttempt = (key: string, success: boolean) => {
  if (success) {
    loginAttempts.delete(key);
    return;
  }

  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || now - current.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return;
  }

  const nextCount = current.count + 1;
  const blockedUntil =
    nextCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_BLOCK_MS : current.blockedUntil;

  loginAttempts.set(key, { count: nextCount, lastAttempt: now, blockedUntil });
};

// 1. EXTENSIÓN DE TIPOS (Mantenemos tu código actual que está bien)
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      empresaId?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    id?: string;
    role?: string;
    empresaId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    empresaId?: string | null;
  }
}

// 2. ELIMINAMOS EL POOL Y EL ADAPTER DE AQUÍ 
// Ya no los necesitamos porque vienen de src/lib/prisma.ts

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
        if (isLoginBlocked(email)) {
          await sleep(600);
          return null;
        }

        // Usamos la instancia centralizada
        const user = await prisma.usuario.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          recordLoginAttempt(email, false);
          await sleep(600);
          return null;
        }

        const isPasswordCorrect = await comparePassword(
          credentials.password as string,
          user.password
        );

        if (!isPasswordCorrect) {
          recordLoginAttempt(email, false);
          await sleep(600);
          return null;
        }

        recordLoginAttempt(email, true);
        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          role: user.rol, // Mapeo de rol de DB a role de NextAuth
          empresaId: user.empresaId ?? null,
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
        if (isLoginBlocked(key)) {
          await sleep(600);
          return null;
        }

        const user = await prisma.usuario.findFirst({
          where: { nfcUidHash: uidHash },
        });

        if (!user) {
          recordLoginAttempt(key, false);
          await sleep(600);
          return null;
        }

        recordLoginAttempt(key, true);
        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          role: user.rol,
          empresaId: user.empresaId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.empresaId = user.empresaId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const userId = token.id ?? token.sub;
        if (userId) {
          session.user.id = userId;
        }
        session.user.role = token.role;
        session.user.empresaId = token.empresaId ?? null;
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
