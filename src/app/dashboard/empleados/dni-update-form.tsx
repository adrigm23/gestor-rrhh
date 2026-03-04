"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarDniUsuario,
  type UpdateDniState,
} from "../../actions/admin-actions";

type DniUpdateFormProps = {
  usuarioId: string;
  dni: string | null;
};

const initialState: UpdateDniState = { status: "idle" };

export default function DniUpdateForm({ usuarioId, dni }: DniUpdateFormProps) {
  const [state, formAction, pending] = useActionState(
    actualizarDniUsuario,
    initialState,
  );
  const router = useRouter();
  const [value, setValue] = useState(dni ?? "");

  useEffect(() => {
    setValue(dni ?? "");
  }, [dni]);

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
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <div className="flex items-center gap-2">
        <input
          name="dni"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="12345678Z"
          pattern="^([XYZxyz]\\d{7}|\\d{8})[A-Za-z]$"
          title="Formato valido: 12345678Z o X1234567L"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "..." : "Actualizar"}
        </button>
      </div>
      {state.message && (
        <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
          {state.message}
        </div>
      )}
    </form>
  );
}
