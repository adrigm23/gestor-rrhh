"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  eliminarUsuario,
  type EliminarUsuarioState,
} from "../../actions/admin-actions";

type UserDeleteFormProps = {
  usuarioId: string;
  usuarioNombre: string;
  disabled?: boolean;
};

const initialState: EliminarUsuarioState = { status: "idle" };

export default function UserDeleteForm({
  usuarioId,
  usuarioNombre,
  disabled = false,
}: UserDeleteFormProps) {
  const [state, formAction, pending] = useActionState(
    eliminarUsuario,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const skipConfirmRef = useRef(false);
  const router = useRouter();

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (skipConfirmRef.current) {
      skipConfirmRef.current = false;
      return;
    }

    if (disabled || pending) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setOpen(true);
  };

  const confirmDelete = () => {
    setOpen(false);
    skipConfirmRef.current = true;
    const form = formRef.current;
    if (!form) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }
    form.submit();
  };

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-2"
      >
        <input type="hidden" name="usuarioId" value={usuarioId} />
        <button
          type="submit"
          disabled={pending || disabled}
          className="w-full rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Eliminando..." : "Eliminar usuario"}
        </button>
        {state.message && (
          <div className={`rounded-xl border px-2 py-1 text-[11px] ${statusClass}`}>
            {state.message}
          </div>
        )}
      </form>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-2xl"
          >
            <h4 className="text-base font-semibold text-[color:var(--text-primary)]">
              Eliminar usuario
            </h4>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Esta accion eliminara a {usuarioNombre} de forma permanente. No se
              puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--card-border)] px-4 py-2 text-sm font-semibold text-[color:var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Confirmar eliminacion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
