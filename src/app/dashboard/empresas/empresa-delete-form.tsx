"use client";

import { useActionState, useEffect } from "react";
import {
  eliminarEmpresa,
  type EliminarEmpresaState,
} from "../../actions/empresa-actions";

type EmpresaDeleteFormProps = {
  empresaId: string;
};

const initialState: EliminarEmpresaState = { status: "idle" };

export default function EmpresaDeleteForm({ empresaId }: EmpresaDeleteFormProps) {
  const [state, formAction, pending] = useActionState(
    eliminarEmpresa,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      // no-op, revalidate will refresh server data
    }
  }, [state.status]);

  const statusClass =
    state.status === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("¿Eliminar esta empresa? Esta accion no se puede deshacer.")) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="empresaId" value={empresaId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
      {state.message && (
        <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
          {state.message}
        </div>
      )}
    </form>
  );
}
