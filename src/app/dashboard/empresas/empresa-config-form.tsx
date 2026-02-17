"use client";

import { useActionState, useEffect, useState } from "react";
import {
  actualizarPausaEmpresa,
  type EmpresaConfigState,
} from "../../actions/empresa-actions";

type EmpresaConfigFormProps = {
  empresaId: string;
  pausaCuentaComoTrabajo: boolean;
};

const initialState: EmpresaConfigState = { status: "idle" };

export default function EmpresaConfigForm({
  empresaId,
  pausaCuentaComoTrabajo,
}: EmpresaConfigFormProps) {
  const [state, formAction, pending] = useActionState(
    actualizarPausaEmpresa,
    initialState,
  );
  const [value, setValue] = useState(
    pausaCuentaComoTrabajo ? "true" : "false",
  );

  useEffect(() => {
    if (state.status === "success") {
      setValue((prev) => prev);
    }
  }, [state.status]);

  const statusClass =
    state.status === "error"
      ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="empresaId" value={empresaId} />
      <select
        name="pausaCuenta"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
      >
        <option value="true">La pausa cuenta</option>
        <option value="false">La pausa NO cuenta</option>
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
