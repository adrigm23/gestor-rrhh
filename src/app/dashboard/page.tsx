import { auth } from "../api/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { toggleFichaje, togglePausa } from "../actions/fichaje-actions";
import { Play, Pause, Clock } from "lucide-react";
import FichajeTimer from "./fichaje-timer";
import PausaTimer from "./pausa-timer";
import SolicitudesFichajeEmpleado, {
  type SolicitudFichajeEmpleado,
} from "./solicitudes-fichaje-empleado";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;
  const userId = session.user?.id;

  if (role === "ADMIN_SISTEMA") {
    redirect("/dashboard/escritorio");
  }

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jornadaActiva = userId
    ? await prisma.fichaje.findFirst({
        where: { usuarioId: userId, salida: null, tipo: "JORNADA" },
        orderBy: { entrada: "desc" },
      })
    : null;

  const entradaIso = jornadaActiva?.entrada
    ? jornadaActiva.entrada.toISOString()
    : null;

  const pausaActiva =
    userId && jornadaActiva
      ? await prisma.fichaje.findFirst({
          where: {
            usuarioId: userId,
            salida: null,
            tipo: "PAUSA_COMIDA",
            entrada: { gte: jornadaActiva.entrada },
          },
          orderBy: { entrada: "desc" },
        })
      : null;

  const pausasCerradas =
    userId && jornadaActiva
      ? await prisma.fichaje.findMany({
          where: {
            usuarioId: userId,
            tipo: "PAUSA_COMIDA",
            entrada: { gte: jornadaActiva.entrada },
            salida: { not: null },
          },
          orderBy: { entrada: "asc" },
        })
      : [];

  const pauseAccumulatedMs = pausasCerradas.reduce((total, pausa) => {
    const end = pausa.salida ? pausa.salida.getTime() : pausa.entrada.getTime();
    return total + Math.max(0, end - pausa.entrada.getTime());
  }, 0);

  const pauseStartIso = pausaActiva?.entrada
    ? pausaActiva.entrada.toISOString()
    : null;

  const solicitudesFichaje: SolicitudFichajeEmpleado[] =
    role === "EMPLEADO" && userId
      ? (
          await prisma.solicitudModificacionFichaje.findMany({
            where: { empleadoId: userId, estado: "PENDIENTE" },
            include: {
              solicitante: { select: { nombre: true, email: true } },
              fichaje: { select: { entrada: true, salida: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        ).map((item) => ({
          id: item.id,
          solicitanteNombre: item.solicitante.nombre,
          solicitanteEmail: item.solicitante.email,
          fichajeEntrada: item.fichaje?.entrada
            ? item.fichaje.entrada.toISOString()
            : null,
          fichajeSalida: item.fichaje?.salida
            ? item.fichaje.salida.toISOString()
            : null,
          entradaPropuesta: item.entradaPropuesta
            ? item.entradaPropuesta.toISOString()
            : null,
          salidaPropuesta: item.salidaPropuesta
            ? item.salidaPropuesta.toISOString()
            : null,
          motivo: item.motivo ?? null,
          createdAt: item.createdAt.toISOString(),
        }))
      : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Fichaje
          </p>
          <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
            Resumen semanal
          </h2>
          <p className="text-sm text-[color:var(--text-muted)] capitalize">
            {hoy}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2.75rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[color:var(--text-muted)]">
                Estado de la jornada
              </p>
              <p className="text-2xl font-semibold text-[color:var(--text-primary)]">
                {jornadaActiva ? "Jornada en curso" : "Jornada cerrada"}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                jornadaActiva
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {jornadaActiva ? "Activa" : "Cerrada"}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                <Clock size={14} className="text-[color:var(--text-muted)]" />
                Tiempo trabajado
              </div>
              <FichajeTimer
                startIso={entradaIso}
                pauseAccumulatedMs={pauseAccumulatedMs}
                pauseStartIso={pauseStartIso}
                className="mt-3 block text-3xl font-semibold text-[color:var(--text-primary)]"
              />
            </div>
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                <Clock size={14} className="text-[color:var(--text-muted)]" />
                Tiempo pausado
              </div>
              <PausaTimer
                pauseAccumulatedMs={pauseAccumulatedMs}
                pauseStartIso={pauseStartIso}
                className="mt-3 block text-3xl font-semibold text-[color:var(--text-secondary)]"
              />
            </div>
          </div>

          {jornadaActiva ? (
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
              <form action={togglePausa}>
                <button
                  className={`flex w-full items-center justify-center gap-2 rounded-full py-5 text-lg font-semibold text-white shadow-2xl transition ${
                    pausaActiva
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200/70"
                      : "bg-teal-500 hover:bg-teal-600 shadow-teal-200/70"
                  }`}
                >
                  {pausaActiva ? <Play size={18} /> : <Pause size={18} />}
                  {pausaActiva ? "Reanudar" : "Pausa"}
                </button>
              </form>
              <form action={toggleFichaje}>
                <button className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 py-5 text-lg font-semibold text-white shadow-2xl shadow-slate-300/60 transition hover:brightness-110">
                  <Play size={18} className="rotate-180" />
                  Salir
                </button>
              </form>
            </div>
          ) : (
            <form action={toggleFichaje} className="mt-10">
              <button className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-5 text-lg font-semibold text-white shadow-2xl shadow-sky-200/80 transition hover:brightness-110">
                Registrar entrada
              </button>
            </form>
          )}
        </section>

        <aside className="rounded-[2.75rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
            Estado rapido
          </h3>
          <p className="text-sm text-[color:var(--text-muted)]">
            Tu resumen de actividad para hoy.
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
              {jornadaActiva
                ? "Tu jornada sigue abierta."
                : "No tienes jornada activa en este momento."}
            </div>
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
              {pausaActiva
                ? "Actualmente estas en pausa."
                : "No hay pausas activas."}
            </div>
          </div>
        </aside>
      </div>

      {role === "EMPLEADO" && (
        <SolicitudesFichajeEmpleado solicitudes={solicitudesFichaje} />
      )}
    </div>
  );
}
