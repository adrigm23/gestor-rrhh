"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarPassword,
  actualizarPerfil,
  actualizarTarjetaNfc,
  type AjustesState,
} from "../../actions/ajustes-actions";

type AjustesFormsProps = {
  nombre: string;
  email: string;
  forcePasswordChange?: boolean;
};

const initialState: AjustesState = { status: "idle" };

export default function AjustesForms({
  nombre,
  email,
  forcePasswordChange = false,
}: AjustesFormsProps) {
  const [perfilState, perfilAction, perfilPending] = useActionState(
    actualizarPerfil,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    actualizarPassword,
    initialState,
  );
  const [nfcState, nfcAction, nfcPending] = useActionState(
    actualizarTarjetaNfc,
    initialState,
  );
  const [nfcUid, setNfcUid] = useState("");
  const nfcInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (nfcState.status === "success") {
      setNfcUid("");
    }
  }, [nfcState.status]);

  useEffect(() => {
    if (passwordState.status === "success") {
      router.refresh();
    }
  }, [passwordState.status, router]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {forcePasswordChange && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 lg:col-span-2">
          Por seguridad, debes actualizar tu contrasena antes de continuar.
        </div>
      )}
      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Informacion personal
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Actualiza tu nombre y correo principal.
        </p>

        {perfilState.message && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              perfilState.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {perfilState.message}
          </div>
        )}

        <form action={perfilAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Nombre
            </label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={nombre}
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <button
            type="submit"
            disabled={perfilPending}
            className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {perfilPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Seguridad
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Cambia tu contrasena actual.
        </p>

        {passwordState.message && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              passwordState.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {passwordState.message}
          </div>
        )}

        <form action={passwordAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Contrasena actual
            </label>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Nueva contrasena
            </label>
            <input
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Confirmar contrasena
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <button
            type="submit"
            disabled={passwordPending}
            className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-300/60 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {passwordPending ? "Actualizando..." : "Actualizar contrasena"}
          </button>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)] lg:col-span-2">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Tarjeta NFC
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Acerca tu tarjeta al lector para asociarla a tu cuenta.
        </p>

        {nfcState.message && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              nfcState.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {nfcState.message}
          </div>
        )}

        <form action={nfcAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              UID de tarjeta
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={nfcInputRef}
                name="nfcUid"
                type="text"
                value={nfcUid}
                onChange={(event) => setNfcUid(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    (event.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                  }
                }}
                inputMode="numeric"
                placeholder="Pasa la tarjeta por el lector"
                className="w-full flex-1 rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="button"
                onClick={() => nfcInputRef.current?.focus()}
                className="rounded-full border border-[color:var(--card-border)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
              >
                Activar lector
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={nfcPending}
            className="w-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-sky-600 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {nfcPending ? "Guardando..." : "Asociar tarjeta NFC"}
          </button>
        </form>
      </section>
    </div>
  );
}

