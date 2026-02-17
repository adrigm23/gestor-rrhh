import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";

export default async function AuditoriaPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "ADMIN_SISTEMA") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Sistema
        </p>
        <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
          Auditoria
        </h2>
        <p className="text-sm text-[color:var(--text-muted)]">
          Historial de actividad del sistema (en desarrollo).
        </p>
      </header>

      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        <p className="text-sm text-[color:var(--text-muted)]">
          Esta seccion estara disponible proximamente.
        </p>
      </section>
    </div>
  );
}
