// src/app/api/auth/auth.ts (o donde tengas tu archivo auth.ts)
import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { comparePassword } from "../../../app/utils/password"; // Ajusta la ruta según tu estructura
import { prisma } from "../../../app/lib/prisma"; // 👈 IMPORTA LA INSTANCIA GLOBAL

// 1. EXTENSIÓN DE TIPOS (Mantenemos tu código actual que está bien)
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
  interface User {
    id?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
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

        // Usamos la instancia centralizada
        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const isPasswordCorrect = await comparePassword(
          credentials.password as string,
          user.password
        );

        if (!isPasswordCorrect) return null;

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          role: user.rol, // Mapeo de rol de DB a role de NextAuth
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? undefined;
        session.user.role = token.role;
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
