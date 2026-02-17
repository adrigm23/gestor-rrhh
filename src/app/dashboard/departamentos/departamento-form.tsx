"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  crearDepartamento,
  type OrganizacionState,
} from "../../actions/organizacion-actions";

type EmpresaOption = {
  id: string;
  nombre: string;
};

type CentroOption = {
  id: string;
  nombre: string;
  empresa?: { nombre?: string | null } | null;
};

type GerenteOption = {
  id: string;
  nombre: string;
  email: string;
  empresa?: { nombre?: string | null } | null;
};

type DepartamentoFormProps = {
  role: string;
  empresas: EmpresaOption[];
  centros: CentroOption[];
  gerentes: GerenteOption[];
};

const initialState: OrganizacionState = { status: "idle" };

export default function DepartamentoForm({
  role,
  empresas,
  centros,
  gerentes,
}: DepartamentoFormProps) {
  const [state, formAction, isPending] = useActionState(
    crearDepartamento,
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
      ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  return (
    <form
      id="crear-departamento"
      ref={formRef}
      action={formAction}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Crear departamento
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Define el departamento y asigna un gerente si aplica.
        </p>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.message ?? "Completa los datos para registrar un departamento."}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
            Nombre
          </label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Ej: Operaciones"
          />
        </div>
        {role === "ADMIN_SISTEMA" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Empresa
            </label>
            <select
              name="empresaId"
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
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
          <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
            Gerente
          </label>
          <select
            name="gerenteId"
            className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
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
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
            Centro de trabajo
          </label>
          <select
            name="centroTrabajoId"
            className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Sin centro</option>
            {centros.map((centro) => (
              <option key={centro.id} value={centro.id}>
                {centro.nombre}
                {role === "ADMIN_SISTEMA"
                  ? ` - ${centro.empresa?.nombre ?? "Empresa"}`
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
        {isPending ? "Guardando..." : "Guardar departamento"}
      </button>
    </form>
  );
}
