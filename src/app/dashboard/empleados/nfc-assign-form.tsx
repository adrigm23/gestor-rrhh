"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  asignarTarjetaUsuario,
  type AsignarTarjetaState,
} from "../../actions/admin-actions";

type NfcAssignFormProps = {
  usuarioId: string;
  tieneTarjeta: boolean;
};

const initialState: AsignarTarjetaState = { status: "idle" };

export default function NfcAssignForm({
  usuarioId,
  tieneTarjeta,
}: NfcAssignFormProps) {
  const [state, formAction, pending] = useActionState(
    asignarTarjetaUsuario,
    initialState,
  );
  const router = useRouter();
  const [uid, setUid] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      setUid("");
      router.refresh();
    }
  }, [state.status, router]);

  const statusClass =
    state.status === "error"
      ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[color:var(--text-muted)]">
        {tieneTarjeta ? "Tarjeta asignada" : "Sin tarjeta"}
      </div>
      {state.message && (
        <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
          {state.message}
        </div>
      )}
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="usuarioId" value={usuarioId} />
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            name="nfcUid"
            type="text"
            value={uid}
            onChange={(event) => setUid(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                (event.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
            }}
            inputMode="numeric"
            placeholder="UID tarjeta"
            className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 text-[11px] font-semibold text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
          >
            Leer
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            name="mode"
            value="assign"
            disabled={pending}
            className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Asignar"}
          </button>
          <button
            type="submit"
            name="mode"
            value="clear"
            disabled={pending}
            className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-2 text-[11px] font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)] disabled:opacity-60"
          >
            Quitar
          </button>
        </div>
      </form>
    </div>
  );
}
