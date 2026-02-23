"use client";

import { useEffect } from "react";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] px-6 py-10 text-center shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">
        Algo ha salido mal
      </h1>
      <p className="text-sm text-[color:var(--text-muted)]">
        Hemos registrado el error. Puedes reintentar o volver al dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/70 transition hover:bg-sky-600"
        >
          Reintentar
        </button>
        <a
          href="/dashboard"
          className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-5 py-2 text-sm font-semibold text-[color:var(--text-secondary)]"
        >
          Volver al dashboard
        </a>
      </div>
    </div>
  );
}
