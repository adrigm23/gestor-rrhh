"use client";

import { useActionState } from "react";
import {
  eliminarUsuario,
  type EliminarUsuarioState,
} from "../../actions/admin-actions";

type UserDeleteFormProps = {
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  disabled?: boolean;
};

const initialState: EliminarUsuarioState = { status: "idle" };

export default function UserDeleteForm({
  usuarioId,
  usuarioNombre,
  usuarioEmail,
  disabled = false,
}: UserDeleteFormProps) {
  const [state, formAction, pending] = useActionState(
    eliminarUsuario,
    initialState,
  );

  const statusClass =
    state.status === "error"
      ? "border-rose-200/60 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !confirm(
            `Eliminar al usuario ${usuarioNombre} (${usuarioEmail})? Esta accion no se puede deshacer.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="w-full rounded-full border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
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
