"use client";

import Image from "next/image";
import { useActionState } from "react";
import Link from "next/link";
import {
  resetPassword,
  type PasswordResetState,
} from "../actions/password-reset-actions";

type ResetPasswordClientProps = {
  token: string;
};

const initialState: PasswordResetState = { status: "idle" };

export default function ResetPasswordClient({
  token,
}: ResetPasswordClientProps) {
  const [state, action, pending] = useActionState(resetPassword, initialState);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1535]">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-sky-700 to-slate-900 opacity-95" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-teal-400/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-4 w-full max-w-md rounded-[2.5rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
              <Image
                src="/brand/suma3-logo.jpeg"
                alt="suma3 consultores"
                width={48}
                height={48}
                className="h-11 w-11 object-contain"
                priority
              />
            </div>
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">
                suma3 consultores
              </p>
              <p className="text-2xl font-semibold text-white">mdmm</p>
            </div>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">
            Restablecer contrasena
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Define una nueva contrasena segura.
          </p>
        </div>

        {!token ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/20 p-4 text-center text-sm text-red-100">
            El enlace no es valido. Solicita uno nuevo.
          </div>
        ) : (
          <>
            {state.message && (
              <div
                className={`mb-4 rounded-2xl border p-4 text-center text-sm ${
                  state.status === "error"
                    ? "border-red-400/40 bg-red-500/20 text-red-100"
                    : "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                }`}
              >
                {state.message}
              </div>
            )}

            <form action={action} className="space-y-5">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-2">
                <label className="ml-1 text-sm font-medium text-white/80">
                  Nueva contrasena
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white placeholder-white/30 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-sm font-medium text-white/80">
                  Confirmar contrasena
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white placeholder-white/30 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="mt-4 flex w-full items-center justify-center rounded-2xl bg-teal-400 py-4 font-extrabold text-slate-900 shadow-xl transition-all hover:bg-teal-300 active:scale-[0.98] disabled:opacity-60"
              >
                {pending ? "Actualizando..." : "Restablecer contrasena"}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 text-center text-xs text-white/60">
          <Link href="/login" className="text-white hover:text-teal-200">
            Volver al login
          </Link>
        </div>
      </div>
    </main>
  );
}
