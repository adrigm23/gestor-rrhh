import { auth } from "../api/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { getApprovedLeaveType } from "../lib/vacaciones";
import { toggleFichaje, togglePausa } from "../actions/fichaje-actions";
import { Play, Pause, Clock, Fingerprint } from "lucide-react";
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

  const approvedLeaveType = userId ? await getApprovedLeaveType(userId) : null;
  const isOnLeave = Boolean(approvedLeaveType);

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hoyCompact = new Date()
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    })
    .toUpperCase();

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

  const displayName = session.user?.name ?? session.user?.email ?? "Usuario";
  const displayInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "US";
  const estadoActual = jornadaActiva ? "Jornada en curso" : "Fuera de horario";
  const estadoBadge = jornadaActiva ? "Activa" : "Cerrada";
  const accionLabel = jornadaActiva ? "Registrar salida" : "Registrar entrada";
  const accionHelper = jornadaActiva
    ? "Toque para finalizar la jornada"
    : "Toque para iniciar la jornada";
  const pausaLabel = pausaActiva ? "Reanudar" : "Pausa";
  const pausaButtonStyle = pausaActiva
    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200/70"
    : "bg-sky-500 hover:bg-sky-600 shadow-sky-200/70";

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
    <div className="space-y-10">
      <div className="hidden space-y-8 md:block">
        <section className="relative overflow-hidden rounded-[36px] border border-[color:var(--card-border)] bg-slate-950 text-white shadow-[var(--shadow-card)]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.9),rgba(30,41,59,0.65),rgba(2,6,23,0.95))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.35),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(2,132,199,0.25),transparent_55%)]" />
          <div className="relative grid gap-10 p-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                Control horario
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight">
                  Fichaje claro, rapido y sin fricciones
                </h1>
                <p className="max-w-xl text-sm text-white/70">
                  Registra entradas, salidas y pausas desde un panel central con
                  estado en tiempo real y acciones directas.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white/80">
                  Estado: {estadoActual}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white/80">
                  Pausa: {pausaActiva ? "En pausa" : "Sin pausa"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white/80">
                  {hoy}
                </span>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-white/60">Estado actual</p>
                  <p className="text-lg font-semibold">{estadoActual}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    jornadaActiva
                      ? "bg-emerald-400/20 text-emerald-100"
                      : "bg-white/15 text-white/70"
                  }`}
                >
                  {estadoBadge}
                </span>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <form action={toggleFichaje} className="w-full">
                  <button
                    type="submit"
                    disabled={isOnLeave}
                    className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-sky-600 text-white shadow-[0_16px_40px_rgba(14,116,144,0.45)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Fingerprint size={38} />
                  </button>
                </form>
                <p className="mt-4 text-lg font-semibold">{accionLabel}</p>
                <p className="text-xs text-white/70">{accionHelper}</p>
              </div>

              {jornadaActiva && (
                <form action={togglePausa} className="mt-6">
                  <button
                    type="submit"
                    disabled={isOnLeave}
                    className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${pausaButtonStyle}`}
                  >
                    {pausaActiva ? <Play size={16} /> : <Pause size={16} />}
                    {pausaLabel}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-soft)]">
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
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              Se actualiza en tiempo real.
            </p>
          </div>

          <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
              <Clock size={14} className="text-[color:var(--text-muted)]" />
              Tiempo en pausa
            </div>
            <PausaTimer
              pauseAccumulatedMs={pauseAccumulatedMs}
              pauseStartIso={pauseStartIso}
              className="mt-3 block text-3xl font-semibold text-[color:var(--text-secondary)]"
            />
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              Pausas registradas hoy.
            </p>
          </div>

          <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Estado rapido
            </h3>
            <p className="text-xs text-[color:var(--text-muted)]">
              Resumen de actividad diaria.
            </p>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary)]">
              <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3">
                {jornadaActiva
                  ? "Tu jornada sigue abierta."
                  : "No tienes jornada activa en este momento."}
              </div>
              <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3">
                {pausaActiva ? "Actualmente estas en pausa." : "No hay pausas activas."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <section className="rounded-[30px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-sm font-semibold text-white">
                {displayInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {displayName}
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Tu espacio de fichaje
                </p>
              </div>
            </div>
            <span
              className={`h-3 w-3 rounded-full ${
                jornadaActiva ? "bg-emerald-400" : "bg-slate-300"
              }`}
            />
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            {hoyCompact}
          </p>
          <div className="mt-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-3 text-sm">
            <p className="text-xs text-[color:var(--text-muted)]">Estado actual</p>
            <p className="font-semibold text-[color:var(--text-primary)]">
              {estadoActual}
            </p>
          </div>

          <form action={toggleFichaje} className="mt-6 flex flex-col items-center">
            <button
              type="submit"
              disabled={isOnLeave}
              className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-sky-600 text-white shadow-[0_16px_35px_rgba(14,116,144,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Fingerprint size={34} />
            </button>
            <p className="mt-4 text-lg font-semibold text-[color:var(--text-primary)]">
              {accionLabel}
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">{accionHelper}</p>
          </form>

          {jornadaActiva && (
            <form action={togglePausa} className="mt-4">
              <button
                type="submit"
                disabled={isOnLeave}
                className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${pausaButtonStyle}`}
              >
                {pausaActiva ? <Play size={16} /> : <Pause size={16} />}
                {pausaLabel}
              </button>
            </form>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4">
              <p className="text-xs text-[color:var(--text-muted)]">Trabajado hoy</p>
              <FichajeTimer
                startIso={entradaIso}
                pauseAccumulatedMs={pauseAccumulatedMs}
                pauseStartIso={pauseStartIso}
                className="mt-2 block text-lg font-semibold text-[color:var(--text-primary)]"
              />
            </div>
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4">
              <p className="text-xs text-[color:var(--text-muted)]">En pausa</p>
              <PausaTimer
                pauseAccumulatedMs={pauseAccumulatedMs}
                pauseStartIso={pauseStartIso}
                className="mt-2 block text-lg font-semibold text-[color:var(--text-secondary)]"
              />
            </div>
          </div>
        </section>
      </div>

      {isOnLeave && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {approvedLeaveType === "VACACIONES"
            ? "Hoy tienes vacaciones aprobadas. No puedes registrar entradas ni salidas."
            : "Hoy tienes una ausencia aprobada. No puedes registrar entradas ni salidas."}
        </div>
      )}

      {role === "EMPLEADO" && (
        <SolicitudesFichajeEmpleado solicitudes={solicitudesFichaje} />
      )}
    </div>
  );
}
