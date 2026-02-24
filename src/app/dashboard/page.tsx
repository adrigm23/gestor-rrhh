import { auth } from "../api/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { getApprovedLeaveType } from "../lib/vacaciones";
import { togglePausa } from "../actions/fichaje-actions";
import {
  Play,
  CalendarDays,
  AlertTriangle,
  MapPin,
  Coffee,
} from "lucide-react";
import FichajeTimer from "./fichaje-timer";
import FichajeGeoForm from "./fichaje-geo-form";
import PausaTimer from "./pausa-timer";
import DashboardQuickActions from "./dashboard-quick-actions";
import SolicitudesFichajeEmpleado, {
  type SolicitudFichajeEmpleado,
} from "./solicitudes-fichaje-empleado";

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const startOfWeek = (date: Date) => {
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfWeek = (date: Date) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const clampRange = (start: Date, end: Date, now: Date) => {
  const safeEnd = end.getTime() > now.getTime() ? now : end;
  return { start, end: safeEnd };
};

const buildDayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatHours = (hours: number, digits = 1) => hours.toFixed(digits);

const formatExtraHours = (hours: number) => {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0 && m === 0) return "0h";
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const formatActividadTipo = (tipo: string) => {
  switch (tipo) {
    case "PAUSA_COMIDA":
      return "Pausa comida";
    case "DESCANSO":
      return "Descanso";
    case "MEDICO":
      return "Medico";
    default:
      return "Entrada";
  }
};

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

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Buenos dias"
      : now.getHours() < 20
        ? "Buenas tardes"
        : "Buenas noches";
  const fechaLarga = capitalize(
    now.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

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

  const userMeta = userId
    ? await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
          empresa: {
            select: {
              nombre: true,
              pausaCuentaComoTrabajo: true,
              geolocalizacionFichaje: true,
            },
          },
          departamento: {
            select: {
              nombre: true,
              centroTrabajo: { select: { nombre: true, direccion: true } },
            },
          },
        },
      })
    : null;

  const empresaNombre = userMeta?.empresa?.nombre ?? "Empresa";
  const empresaId = session.user?.empresaId ?? null;
  let centroTrabajo =
    userMeta?.departamento?.centroTrabajo ?? null;
  if (!centroTrabajo && empresaId) {
    if (role === "GERENTE") {
      centroTrabajo = await prisma.centroTrabajo.findFirst({
        where: { gerenteId: userId ?? undefined },
        orderBy: { createdAt: "desc" },
        select: { nombre: true, direccion: true },
      });
    }
    if (!centroTrabajo) {
      centroTrabajo = await prisma.centroTrabajo.findFirst({
        where: { empresaId },
        orderBy: { createdAt: "desc" },
        select: { nombre: true, direccion: true },
      });
    }
  }

  const centroTrabajoNombre = centroTrabajo?.nombre ?? "Oficina central";
  const centroTrabajoDireccion = centroTrabajo?.direccion ?? "";
  const mapQuery =
    centroTrabajoDireccion || `${centroTrabajoNombre} ${empresaNombre}`;
  const mapHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        mapQuery,
      )}`
    : null;
  const pausaCuenta = userMeta?.empresa?.pausaCuentaComoTrabajo ?? true;
  const geoEnabled = userMeta?.empresa?.geolocalizacionFichaje ?? false;

  const weekRange = clampRange(startOfWeek(now), endOfWeek(now), now);

  const contrato = userId
    ? await prisma.contrato.findFirst({
        where: {
          usuarioId: userId,
          fechaInicio: { lte: weekRange.end },
          OR: [{ fechaFin: null }, { fechaFin: { gte: weekRange.start } }],
        },
        orderBy: { fechaInicio: "desc" },
      })
    : null;

  const fichajesSemana = userId
    ? await prisma.fichaje.findMany({
        where: {
          usuarioId: userId,
          entrada: { lte: weekRange.end },
          OR: [{ salida: null }, { salida: { gte: weekRange.start } }],
        },
        orderBy: { entrada: "desc" },
      })
    : [];

  let jornadaMs = 0;
  let pausaMs = 0;

  for (const fichaje of fichajesSemana) {
    const start = Math.max(
      fichaje.entrada.getTime(),
      weekRange.start.getTime(),
    );
    const end = Math.min(
      (fichaje.salida ?? now).getTime(),
      weekRange.end.getTime(),
    );

    if (end <= start) continue;
    const duration = end - start;

    if (fichaje.tipo === "PAUSA_COMIDA") {
      pausaMs += duration;
    } else if (fichaje.tipo === "JORNADA") {
      jornadaMs += duration;
    }
  }

  const totalMs = pausaCuenta ? jornadaMs : Math.max(0, jornadaMs - pausaMs);
  const totalHours = totalMs / 3600000;
  const weeklyGoalHours = contrato?.horasSemanales ?? 40;
  const weeklyProgress =
    weeklyGoalHours > 0
      ? Math.min(100, (totalHours / weeklyGoalHours) * 100)
      : 0;
  const extraHours = Math.max(0, totalHours - weeklyGoalHours);

  const { start: todayStart, end: todayEnd } = buildDayRange(now);

  const actividadReciente = userId
    ? await prisma.fichaje.findMany({
        where: {
          usuarioId: userId,
          entrada: { lte: todayEnd },
          OR: [{ salida: null }, { salida: { gte: todayStart } }],
        },
        orderBy: { entrada: "desc" },
        take: 4,
      })
    : [];

  const displayName = session.user?.name ?? session.user?.email ?? "Usuario";
  const conectadoDesde = jornadaActiva
    ? jornadaActiva.entrada.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const accionLabel = jornadaActiva ? "Finalizar Jornada" : "Registrar Entrada";
  const accionHelper = jornadaActiva ? "Registrar Salida" : "Iniciar Jornada";
  const pausaLabel = pausaActiva ? "Reanudar pausa" : "Pausa Comida";

  const bannerTitle = jornadaActiva ? "Jornada abierta" : "Jornada cerrada";
  const bannerDescription = jornadaActiva
    ? "Actualmente estas registrado como \"Trabajando\". No olvides registrar tu salida al finalizar el dia."
    : "No tienes una jornada activa. Registra tu entrada para comenzar.";
  const bannerBadge = jornadaActiva ? "En curso" : "Sin jornada";

  const bannerTone = jornadaActiva
    ? "border-amber-200 bg-amber-50"
    : "border-[color:var(--card-border)] bg-[color:var(--surface)]";
  const bannerIconTone = jornadaActiva
    ? "bg-amber-100 text-amber-600"
    : "bg-slate-100 text-slate-500";
  const bannerBadgeTone = jornadaActiva
    ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";

  const conectadoLabel =
    jornadaActiva && conectadoDesde
      ? `Conectado desde ${conectadoDesde}`
      : "Sin jornada activa";
  const conectadoTone = jornadaActiva
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]";
  const conectadoDot = jornadaActiva ? "bg-emerald-500" : "bg-slate-300";

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
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-[color:var(--text-primary)] md:text-3xl">
            {greeting}, {displayName}
          </p>
          <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <CalendarDays size={16} />
            <span>{fechaLarga}</span>
          </div>
        </div>
        <DashboardQuickActions />
      </header>

      <section
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-3 shadow-[var(--shadow-soft)] ${bannerTone}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bannerIconTone}`}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              {bannerTitle}
            </p>
            <p className="text-sm text-[color:var(--text-secondary)]">
              {bannerDescription}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${bannerBadgeTone}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              jornadaActiva ? "bg-amber-500" : "bg-slate-300"
            }`}
          />
          {bannerBadge}
        </span>
      </section>

      {isOnLeave && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {approvedLeaveType === "VACACIONES"
            ? "Hoy tienes vacaciones aprobadas. No puedes registrar entradas ni salidas."
            : "Hoy tienes una ausencia aprobada. No puedes registrar entradas ni salidas."}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
                  Control de Tiempo
                </h2>
                <p className="text-sm text-[color:var(--text-muted)]">
                  Registro de actividad diaria
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${conectadoTone}`}
              >
                <span className={`h-2 w-2 rounded-full ${conectadoDot}`} />
                {conectadoLabel}
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  Tiempo trabajado
                </p>
                <FichajeTimer
                  startIso={entradaIso}
                  pauseAccumulatedMs={pauseAccumulatedMs}
                  pauseStartIso={pauseStartIso}
                  showSeconds
                  showSuffix={false}
                  highlightSeconds
                  secondsClassName="text-sky-500"
                  className="mt-3 block text-5xl font-semibold tracking-tight text-[color:var(--text-primary)]"
                />
                <div className="mt-5 h-px w-full bg-[color:var(--card-border)]" />
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  Tiempo en pausa
                </p>
                <PausaTimer
                  pauseAccumulatedMs={pauseAccumulatedMs}
                  pauseStartIso={pauseStartIso}
                  showSeconds
                  showSuffix={false}
                  className="mt-2 block text-2xl font-semibold text-slate-400"
                />
              </div>

              <div className="flex flex-col gap-4">
                <FichajeGeoForm
                  disabled={isOnLeave}
                  enabled={geoEnabled}
                  accionLabel={accionLabel}
                  accionHelper={accionHelper}
                />
                {jornadaActiva && (
                  <form action={togglePausa}>
                    <button
                      type="submit"
                      disabled={isOnLeave}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pausaActiva ? <Play size={16} /> : <Coffee size={16} />}
                      {pausaLabel}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
                  Actividad reciente
                </h3>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Ultimos movimientos del dia
                </p>
              </div>
              <a
                href="/dashboard/calendario"
                className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
              >
                Ver todo
              </a>
            </div>

            {actividadReciente.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
                No hay actividad registrada hoy.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--card-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[color:var(--surface-muted)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold">Hora</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Ubicacion
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--card-border)]">
                    {actividadReciente.map((fichaje) => {
                      const estado = fichaje.salida ? "Completado" : "En curso";
                      const ubicacion =
                        (fichaje.latitud && fichaje.longitud) ||
                        (fichaje.latitudSalida && fichaje.longitudSalida)
                          ? "Ubicacion GPS"
                          : centroTrabajoNombre;
                      return (
                        <tr
                          key={fichaje.id}
                          className="text-[color:var(--text-secondary)]"
                        >
                          <td className="px-4 py-3 font-semibold text-[color:var(--text-primary)]">
                            {formatActividadTipo(fichaje.tipo)}
                          </td>
                          <td className="px-4 py-3">
                            {fichaje.entrada.toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3">{ubicacion}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                fichaje.salida
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Resumen semanal
            </h3>
            <div className="mt-4 space-y-4 text-sm text-[color:var(--text-secondary)]">
              <div>
                <div className="flex items-center justify-between">
                  <span>Horas trabajadas</span>
                  <span className="font-semibold text-[color:var(--text-primary)]">
                    {formatHours(totalHours, 1)} /{" "}
                    {formatHours(weeklyGoalHours, 0)}h
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-sky-500"
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span>Horas extra</span>
                  <span className="font-semibold text-[color:var(--text-primary)]">
                    {formatExtraHours(extraHours)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-purple-500"
                    style={{
                      width: `${Math.min(
                        100,
                        weeklyGoalHours > 0
                          ? (extraHours / weeklyGoalHours) * 100
                          : 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Vacaciones
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
                  {approvedLeaveType === "VACACIONES" ? "Hoy" : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Ausencias
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
                  {approvedLeaveType === "AUSENCIA" ? "Hoy" : "--"}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card)] shadow-[var(--shadow-soft)]">
            <div className="relative h-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_55%),radial-gradient(circle_at_bottom,rgba(14,116,144,0.18),transparent_60%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg">
                  <MapPin size={20} />
                </div>
              </div>
            </div>
            <div className="border-t border-[color:var(--card-border)] px-5 py-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {centroTrabajoNombre}
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">
                {centroTrabajoDireccion || empresaNombre}
              </p>
              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                >
                  Abrir en mapas
                </a>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <a
              href="/dashboard/calendario#historial"
              className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-4 text-center text-sm font-semibold text-[color:var(--text-secondary)] shadow-sm transition hover:text-sky-600"
            >
              Historico
            </a>
            <a
              href="/dashboard/calendario#solicitudes"
              className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-4 text-center text-sm font-semibold text-[color:var(--text-secondary)] shadow-sm transition hover:text-sky-600"
            >
              Reportar
            </a>
          </div>
        </aside>
      </div>

      {role === "EMPLEADO" && (
        <SolicitudesFichajeEmpleado solicitudes={solicitudesFichaje} />
      )}
    </div>
  );
}
