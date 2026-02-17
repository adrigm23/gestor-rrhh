import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import KioskoForm from "./kiosko-form";

export default async function KioskoPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "EMPLEADO") {
    redirect("/dashboard");
  }

  const recent = await prisma.fichaje.findMany({
    include: {
      usuario: {
        select: {
          nombre: true,
          email: true,
          departamento: { select: { nombre: true } },
        },
      },
    },
    orderBy: { entrada: "desc" },
    take: 6,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Kiosko
        </p>
        <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
          Kiosko NFC
        </h2>
        <p className="text-sm text-[color:var(--text-muted)]">
          Mantén esta pantalla abierta en el puesto de control y registra entradas
          en tiempo real.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
          <KioskoForm />
        </section>

        <aside className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
                Recent Activity
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                Ultimos fichajes registrados
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              Live
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {recent.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">
                No hay actividad reciente.
              </p>
            ) : (
              recent.map((fichaje) => {
                const estado = fichaje.salida ? "Salida" : "Entrada";
                const estadoClass = fichaje.salida
                  ? "text-amber-600"
                  : "text-emerald-600";
                return (
                  <div
                    key={fichaje.id}
                    className="flex items-center justify-between rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {fichaje.usuario.nombre}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {fichaje.usuario.departamento?.nombre ?? "Sin departamento"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[color:var(--text-muted)]">
                      <p className={`font-semibold ${estadoClass}`}>{estado}</p>
                      <p>{fichaje.entrada.toLocaleTimeString("es-ES")}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
