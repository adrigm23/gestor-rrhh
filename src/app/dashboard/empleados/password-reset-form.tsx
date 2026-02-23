"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resetUsuarioPassword,
  type ResetPasswordState,
} from "../../actions/admin-actions";

type PasswordResetFormProps = {
  usuarioId: string;
};

const initialState: ResetPasswordState = { status: "idle" };

export default function PasswordResetForm({ usuarioId }: PasswordResetFormProps) {
  const [state, formAction, pending] = useActionState(
    resetUsuarioPassword,
    initialState,
  );
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      setPassword("");
      setShowPassword(false);
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
      <div className="text-xs font-semibold text-[color:var(--text-muted)]">
        Restablecer contrasena
      </div>
      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          placeholder="Nueva contrasena"
          className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-2 pr-10 text-xs text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-1 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
          aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
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
