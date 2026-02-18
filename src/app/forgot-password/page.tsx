"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, SendHorizontal } from "lucide-react";
import {
  solicitarResetPassword,
  type PasswordResetState,
} from "../actions/password-reset-actions";

const initialState: PasswordResetState = { status: "idle" };

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    solicitarResetPassword,
    initialState,
  );
  const [email, setEmail] = useState("");

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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              {state.status === "success" ? (
                <CheckCircle2 size={26} />
              ) : (
                <Mail size={24} />
              )}
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900">
              {state.status === "success"
                ? "Enlace enviado"
                : "Recuperar contrasena"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {state.status === "success"
                ? "Te hemos enviado las instrucciones a tu correo. Revisa la bandeja de entrada (y spam)."
                : "Introduce tu email y te enviaremos un enlace para restablecer la contrasena."}
            </p>
          </div>

          {state.status !== "success" && (
            <form action={action} className="mt-8 space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium text-slate-700">
                  Correo electronico
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <Mail size={16} className="text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ejemplo@empresa.com"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200/70 transition hover:bg-sky-600 disabled:opacity-60"
              >
                <SendHorizontal size={16} />
                {pending ? "Enviando..." : "Enviar enlace de recuperacion"}
              </button>
            </form>
          )}

          {state.status === "success" && (
            <div className="mt-8 space-y-4">
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-2xl bg-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200/70 transition hover:bg-teal-600"
              >
                Entendido →
              </Link>
              <form action={action}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full text-sm font-semibold text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
                >
                  Reenviar correo
                </button>
              </form>
            </div>
          )}

          {state.status === "error" && state.message && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-600">
              {state.message}
            </div>
          )}

          {state.status !== "success" && (
            <div className="mt-8 text-center text-xs text-slate-500">
              <Link href="/login" className="font-semibold text-slate-700">
                ← Volver al login
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
