"use client";

import { useActionState } from "react";
import {
  actualizarPassword,
  actualizarPerfil,
  type AjustesState,
} from "../../actions/ajustes-actions";

type AjustesFormsProps = {
  nombre: string;
  email: string;
};

const initialState: AjustesState = { status: "idle" };

export default function AjustesForms({ nombre, email }: AjustesFormsProps) {
  const [perfilState, perfilAction, perfilPending] = useActionState(
    actualizarPerfil,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    actualizarPassword,
    initialState,
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <h3 className="text-lg font-semibold text-slate-900">Informacion personal</h3>
        <p className="mt-1 text-sm text-slate-500">
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
            <label className="text-sm font-semibold text-slate-700">Nombre</label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={nombre}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
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

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <h3 className="text-lg font-semibold text-slate-900">Seguridad</h3>
        <p className="mt-1 text-sm text-slate-500">
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
            <label className="text-sm font-semibold text-slate-700">
              Contrasena actual
            </label>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Nueva contrasena
            </label>
            <input
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Confirmar contrasena
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
    </div>
  );
}

