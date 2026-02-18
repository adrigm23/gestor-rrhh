"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
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
  const searchParams = useSearchParams();
  const [resolvedToken, setResolvedToken] = useState(token);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const tokenFromQuery = useMemo(() => {
    const param = searchParams?.get("token") ?? "";
    return typeof param === "string" ? param : "";
  }, [searchParams]);

  useEffect(() => {
    if (resolvedToken) return;

    if (tokenFromQuery) {
      setResolvedToken(tokenFromQuery);
      return;
    }

    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash.startsWith("?") ? hash : `?${hash}`);
        const hashToken = params.get("token");
        if (hashToken) {
          setResolvedToken(hashToken);
        }
      }
    }
  }, [resolvedToken, tokenFromQuery]);

  return (
    <main className="relative min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(45,212,191,0.14),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-40 [background-size:32px_32px] [background-image:linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-md">
            <Image
              src="/brand/suma3-logo.jpeg"
              alt="suma3 consultores"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              suma3 consultores
            </p>
            <p className="text-base font-semibold text-slate-900">mdmm</p>
          </div>
        </div>
        <a
          href="mailto:soporte@suma3consultores.com"
          className="font-medium text-slate-500 hover:text-slate-700"
        >
          Necesitas ayuda?
        </a>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[75vh] w-full max-w-5xl items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_30px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ShieldCheck size={24} />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900">
              Restablecer contrasena
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Ingresa tu nueva contrasena para acceder a tu cuenta.
            </p>
          </div>

          {!resolvedToken ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-600">
              El enlace no es valido. Solicita uno nuevo.
            </div>
          ) : (
            <>
              {state.message && (
                <div
                  className={`mt-6 rounded-2xl border px-4 py-3 text-center text-sm ${
                    state.status === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {state.message}
                </div>
              )}

              <form action={action} className="mt-6 space-y-5">
                <input type="hidden" name="token" value={resolvedToken} />
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-700">
                    Nueva contrasena
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      required
                      autoComplete="new-password"
                      className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-700">
                    Confirmar contrasena
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      required
                      autoComplete="new-password"
                      className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="text-slate-400 transition hover:text-slate-600"
                      aria-label={
                        showConfirm ? "Ocultar contrasena" : "Mostrar contrasena"
                      }
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {pending ? "Actualizando..." : "Restablecer contrasena"}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center text-xs text-slate-500">
            <Link href="/login" className="font-semibold text-slate-700">
              ← Volver al inicio de sesion
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
