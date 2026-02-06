"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const [uid, setUid] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      setUid("");
    }
  }, [state.status]);

  const statusClass =
    state.status === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-500">
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
            className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
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
            className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Asignar"}
          </button>
          <button
            type="submit"
            name="mode"
            value="clear"
            disabled={pending}
            className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Quitar
          </button>
        </div>
      </form>
    </div>
  );
}
