"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearEmpresa, type EmpresaState } from "../../actions/empresa-actions";

const initialState: EmpresaState = { status: "idle" };

export default function EmpresaForm() {
  const [state, formAction, isPending] = useActionState(
    crearEmpresa,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  const statusClass =
    state.status === "error"
      ? "border-red-200 bg-red-50 text-red-600"
      : state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <form
      id="crear-empresa"
      ref={formRef}
      action={formAction}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Crear empresa</h3>
        <p className="mt-1 text-sm text-slate-500">
          Registra la empresa en el sistema.
        </p>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.message ?? "Completa los datos para registrar una empresa."}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Nombre</label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="Ej: Suma3 Consultores"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">CIF</label>
          <input
            name="cif"
            type="text"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="B12345678"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Guardar empresa"}
      </button>
    </form>
  );
}
