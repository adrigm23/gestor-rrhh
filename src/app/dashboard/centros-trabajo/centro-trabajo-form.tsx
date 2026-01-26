"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  crearCentroTrabajo,
  type OrganizacionState,
} from "../../actions/organizacion-actions";

type EmpresaOption = {
  id: string;
  nombre: string;
};

type GerenteOption = {
  id: string;
  nombre: string;
  email: string;
  empresa?: { nombre?: string | null } | null;
};

type CentroTrabajoFormProps = {
  role: string;
  empresas: EmpresaOption[];
  gerentes: GerenteOption[];
};

const initialState: OrganizacionState = { status: "idle" };

export default function CentroTrabajoForm({
  role,
  empresas,
  gerentes,
}: CentroTrabajoFormProps) {
  const [state, formAction, isPending] = useActionState(
    crearCentroTrabajo,
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
    <form id="crear-centro" ref={formRef} action={formAction} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Crear centro de trabajo
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Organiza los departamentos dentro de un centro.
        </p>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.message ?? "Completa los datos para registrar un centro."}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nombre</label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Ej: Planta Norte"
          />
        </div>
        {role === "ADMIN_SISTEMA" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Empresa</label>
            <select
              name="empresaId"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Selecciona empresa</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Gerente</label>
          <select
            name="gerenteId"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Sin gerente</option>
            {gerentes.map((gerente) => (
              <option key={gerente.id} value={gerente.id}>
                {gerente.nombre}
                {role === "ADMIN_SISTEMA"
                  ? ` - ${gerente.empresa?.nombre ?? "Empresa"}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Guardar centro"}
      </button>
    </form>
  );
}
