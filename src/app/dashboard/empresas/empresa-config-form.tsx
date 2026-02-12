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
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="empresaId" value={empresaId} />
      <select
        name="pausaCuenta"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
      >
        <option value="true">La pausa cuenta</option>
        <option value="false">La pausa NO cuenta</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
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
