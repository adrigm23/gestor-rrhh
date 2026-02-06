"use client";

import { useActionState, useEffect, useState } from "react";
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
  empresaIdActual: string;
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
  const [empresaId, setEmpresaId] = useState(empresaIdActual);

  useEffect(() => {
    if (state.status === "success") {
      setEmpresaId((prev) => prev);
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
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <select
        name="empresaId"
        value={empresaId}
        onChange={(event) => setEmpresaId(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
      >
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
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
