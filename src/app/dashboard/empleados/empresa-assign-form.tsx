"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cambiarEmpresaUsuario,
  type CambiarEmpresaState,
} from "../../actions/admin-actions";

type EmpresaOption = {
  id: string;
  nombre: string;
};

type EmpresaAssignFormProps = {
  usuarioId: string;
  empresaIdActual: string | null;
  empresas: EmpresaOption[];
};

const initialState: CambiarEmpresaState = { status: "idle" };

export default function EmpresaAssignForm({
  usuarioId,
  empresaIdActual,
  empresas,
}: EmpresaAssignFormProps) {
  const [state, formAction, pending] = useActionState(
    cambiarEmpresaUsuario,
    initialState,
  );
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(
    empresaIdActual ?? empresas[0]?.id ?? "",
  );

  useEffect(() => {
    if (state.status === "success") {
      setEmpresaId((prev) => prev);
      router.refresh();
    }
  }, [state.status, router]);

  useEffect(() => {
    if (empresaIdActual) {
      setEmpresaId(empresaIdActual);
    } else if (empresas[0]?.id) {
      setEmpresaId(empresas[0].id);
    } else {
      setEmpresaId("");
    }
  }, [empresaIdActual, empresas]);

  const statusClass =
    state.status === "error"
      ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <select
        name="empresaId"
        value={empresaId}
        onChange={(event) => setEmpresaId(event.target.value)}
        className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
      >
        {empresaId === "" && (
          <option value="">Sin empresa</option>
        )}
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {state.message && (
        <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
          {state.message}
        </div>
      )}
    </form>
  );
}
