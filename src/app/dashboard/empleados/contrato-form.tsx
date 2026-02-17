"use client";

import { useActionState, useEffect, useState } from "react";
import { crearContrato, type ContratoState } from "../../actions/admin-actions";

type ContratoFormProps = {
  usuarioId: string;
  horasActuales: number | null;
  fechaInicioActual?: string | null;
};

const initialState: ContratoState = { status: "idle" };

export default function ContratoForm({
  usuarioId,
  horasActuales,
  fechaInicioActual,
}: ContratoFormProps) {
  const [state, formAction, pending] = useActionState(
    crearContrato,
    initialState,
  );
  const [horas, setHoras] = useState(
    horasActuales ? String(horasActuales) : "40",
  );
  const [fechaInicio, setFechaInicio] = useState(
    fechaInicioActual ?? "",
  );

  useEffect(() => {
    if (state.status === "success") {
      setHoras((prev) => prev);
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
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <div className="text-xs font-semibold text-[color:var(--text-muted)]">
        {horasActuales ? `${horasActuales} h/sem` : "Sin contrato"}
      </div>
      <div className="flex flex-col gap-2">
        <input
          name="horasSemanales"
          type="number"
          min="1"
          max="60"
          step="0.5"
          required
          value={horas}
          onChange={(event) => setHoras(event.target.value)}
          className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="40"
        />
        <input
          name="fechaInicio"
          type="date"
          value={fechaInicio}
          onChange={(event) => setFechaInicio(event.target.value)}
          className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Actualizar"}
      </button>
      {state.message && (
        <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
          {state.message}
        </div>
      )}
    </form>
  );
}
