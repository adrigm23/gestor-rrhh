"use client";

import { useActionState } from "react";
import {
  actualizarEstadoUsuario,
  type EstadoUsuarioState,
} from "../../actions/admin-actions";

type UserStatusFormProps = {
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  activo: boolean;
  disabled?: boolean;
};

const initialState: EstadoUsuarioState = { status: "idle" };

export default function UserStatusForm({
  usuarioId,
  usuarioNombre,
  usuarioEmail,
  activo,
  disabled = false,
}: UserStatusFormProps) {
  const [state, formAction, pending] = useActionState(
    actualizarEstadoUsuario,
    initialState,
  );

  const statusClass =
    state.status === "error"
      ? "border-rose-200/60 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700"
        : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";

  const badgeClass = activo
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const actionLabel = activo ? "dar de baja" : "reactivar";
        if (
          !confirm(
            `Confirmar ${actionLabel} a ${usuarioNombre} (${usuarioEmail})?`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="accion" value={activo ? "baja" : "reactivar"} />
      <div className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass}`}>
        {activo ? "Activo" : "Baja"}
      </div>
      <button
        type="submit"
        disabled={pending || disabled}
        className="w-full rounded-full border border-[color:var(--card-border)] px-3 py-2 text-[11px] font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Actualizando..." : activo ? "Dar de baja" : "Reactivar"}
      </button>
      {state.message && (
        <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
          {state.message}
        </div>
      )}
    </form>
  );
}
