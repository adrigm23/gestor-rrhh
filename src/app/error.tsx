"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-primary)]">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-3xl font-semibold">Se ha producido un error</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Hemos registrado el problema. Puedes reintentar la accion o volver al
            inicio.
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
              href="/"
              className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-5 py-2 text-sm font-semibold text-[color:var(--text-secondary)]"
            >
              Ir al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
