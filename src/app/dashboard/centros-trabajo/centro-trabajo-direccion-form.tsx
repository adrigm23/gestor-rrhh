"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarCentroTrabajoDireccion,
  type OrganizacionState,
} from "../../actions/organizacion-actions";

type CentroTrabajoDireccionFormProps = {
  centroId: string;
  direccionActual?: string | null;
};

const initialState: OrganizacionState = { status: "idle" };

export default function CentroTrabajoDireccionForm({
  centroId,
  direccionActual,
}: CentroTrabajoDireccionFormProps) {
  const [state, formAction, pending] = useActionState(
    actualizarCentroTrabajoDireccion,
    initialState,
  );
  const [value, setValue] = useState(direccionActual ?? "");
  const router = useRouter();

  useEffect(() => {
    setValue(direccionActual ?? "");
  }, [direccionActual]);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  const statusClass =
    state.status === "error"
      ? "border-rose-200/60 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="centroId" value={centroId} />
      <input
        name="direccion"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Sin direccion"
        className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
      />
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
