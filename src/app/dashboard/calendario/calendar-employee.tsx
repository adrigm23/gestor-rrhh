"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import FichajeTimer from "../fichaje-timer";
import {
  notificarAusencia,
  solicitarVacaciones,
  type SolicitudState,
} from "../../actions/solicitudes-actions";

export type SolicitudResumen = {
  id: string;
  tipo: "VACACIONES" | "AUSENCIA";
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA" | "ANULADA";
  inicio: string;
  fin: string | null;
  createdAt: string;
  motivo: string | null;
  ausenciaTipo: "FALTA" | "AVISO" | null;
};

export type FichajeResumen = {
  entrada: string;
  salida: string | null;
};

type CalendarioEmpleadoProps = {
  solicitudes: SolicitudResumen[];
  fichajes: FichajeResumen[];
  jornadaEntradaIso?: string | null;
  pauseStartIso?: string | null;
  pauseAccumulatedMs?: number;
  jornadaActiva?: boolean;
  pausaActiva?: boolean;
};

type FechaSeleccion = Date | null;
type DayEventType = "fichaje" | "vacaciones" | "ausencia";
type DayEvent = {
  type: DayEventType;
  label: string;
  time?: string;
};

const emptyState: SolicitudState = { status: "idle" };
const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const buildCalendar = (base: Date) => {
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;

  const cells: (Date | null)[] = Array.from(
    { length: startOffset },
    () => null,
  );

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return { year, month, cells };
};

const formatRange = (item: SolicitudResumen) => {
  const start = new Date(item.inicio);
  const end = item.fin ? new Date(item.fin) : null;
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  });
  const startLabel = formatter.format(start);
  const endLabel = end ? formatter.format(end) : startLabel;
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

const statusStyles: Record<SolicitudResumen["estado"], string> = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  APROBADA: "bg-emerald-100 text-emerald-700",
  RECHAZADA: "bg-rose-100 text-rose-700",
  ANULADA: "bg-slate-100 text-slate-600",
};

const statusLabel: Record<SolicitudResumen["estado"], string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  ANULADA: "Anulada",
};

const buildDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addRangeToSet = (set: Set<string>, start: Date, end: Date) => {
  const cursor = new Date(start);
  while (cursor <= end) {
    set.add(buildDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
};

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export default function CalendarioEmpleado({
  solicitudes,
  fichajes,
  jornadaEntradaIso = null,
  pauseStartIso = null,
  pauseAccumulatedMs = 0,
  jornadaActiva = false,
  pausaActiva = false,
}: CalendarioEmpleadoProps) {
  const [tab, setTab] = useState<"vacaciones" | "ausencia">("vacaciones");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<FechaSeleccion>(null);
  const [rangeEnd, setRangeEnd] = useState<FechaSeleccion>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"mes" | "semana" | "dia">("mes");
  const vacacionesAnchorId = "solicitar-vacaciones";

  const [vacState, vacAction] = useActionState(
    solicitarVacaciones,
    emptyState,
  );
  const [ausState, ausAction] = useActionState(
    notificarAusencia,
    emptyState,
  );

  const { cells, month, year } = useMemo(
    () => buildCalendar(viewDate),
    [viewDate],
  );

  const monthTitle = useMemo(() => {
    const monthName = new Intl.DateTimeFormat("es-ES", {
      month: "long",
    }).format(new Date(year, month, 1));
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
  }, [month, year]);

  const fichajeDays = useMemo(() => {
    const set = new Set<string>();
    fichajes.forEach((item) => {
      const date = new Date(item.entrada);
      set.add(buildDateKey(date));
    });
    return set;
  }, [fichajes]);

  const fichajeRanges = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date }>();
    fichajes.forEach((item) => {
      const entrada = new Date(item.entrada);
      const salida = item.salida ? new Date(item.salida) : entrada;
      const key = buildDateKey(entrada);
      const current = map.get(key);
      if (!current) {
        map.set(key, { start: entrada, end: salida });
        return;
      }
      if (entrada < current.start) {
        current.start = entrada;
      }
      if (salida > current.end) {
        current.end = salida;
      }
    });
    return map;
  }, [fichajes]);

  const { vacacionesDays, ausenciaDays } = useMemo(() => {
    const vacaciones = new Set<string>();
    const ausencias = new Set<string>();

    solicitudes.forEach((item) => {
      if (item.estado !== "APROBADA") {
        return;
      }
      const inicio = new Date(item.inicio);
      const fin = item.fin ? new Date(item.fin) : inicio;
      if (item.tipo === "VACACIONES") {
        addRangeToSet(vacaciones, inicio, fin);
      } else {
        addRangeToSet(ausencias, inicio, fin);
      }
    });

    return { vacacionesDays: vacaciones, ausenciaDays: ausencias };
  }, [solicitudes]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const addEvent = (key: string, event: DayEvent) => {
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    };

    fichajeRanges.forEach((range, key) => {
      const startLabel = formatTime(range.start);
      const endLabel = formatTime(range.end);
      const time = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
      addEvent(key, { type: "fichaje", label: "Fichaje", time });
    });

    solicitudes.forEach((item) => {
      if (item.estado !== "APROBADA") {
        return;
      }
      const inicio = new Date(item.inicio);
      const fin = item.fin ? new Date(item.fin) : inicio;
      const label =
        item.tipo === "VACACIONES"
          ? "Vacaciones"
          : item.ausenciaTipo === "FALTA"
            ? "Falta"
            : "Ausencia";
      const type: DayEventType = item.tipo === "VACACIONES" ? "vacaciones" : "ausencia";
      const cursor = new Date(inicio);
      while (cursor <= fin) {
        addEvent(buildDateKey(cursor), { type, label });
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [fichajeRanges, solicitudes]);

  const startValue = rangeStart ? formatDateInput(rangeStart) : "";
  const endValue = rangeEnd ? formatDateInput(rangeEnd) : "";

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (tab !== "vacaciones") {
      return;
    }

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    if (rangeStart && !rangeEnd) {
      if (date.getTime() < rangeStart.getTime()) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        setRangeEnd(date);
      }
    }
  };

  const isInRange = (date: Date) => {
    if (!rangeStart) return false;
    if (!rangeEnd) return sameDay(date, rangeStart);
    return (
      date.getTime() >= rangeStart.getTime() &&
      date.getTime() <= rangeEnd.getTime()
    );
  };

  const vacacionesCount = solicitudes.filter((s) => s.tipo === "VACACIONES").length;
  const ausenciasCount = solicitudes.filter((s) => s.tipo === "AUSENCIA").length;
  const pendientesCount = solicitudes.filter((s) => s.estado === "PENDIENTE").length;

  const handleSolicitar = (nextTab: "vacaciones" | "ausencia") => {
    setTab(nextTab);
    requestAnimationFrame(() => {
      document
        .getElementById(vacacionesAnchorId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const selectedKey = buildDateKey(selectedDate);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const selectedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
      }).format(selectedDate),
    [selectedDate],
  );
  const todayKey = buildDateKey(new Date());

  const eventPillStyles: Record<DayEventType, string> = {
    fichaje: "bg-sky-100 text-sky-700",
    vacaciones: "bg-indigo-100 text-indigo-700",
    ausencia: "bg-amber-100 text-amber-700",
  };

  const dotStyles: Record<DayEventType, string> = {
    fichaje: "bg-sky-500",
    vacaciones: "bg-indigo-500",
    ausencia: "bg-amber-400",
  };

  const turnoBadge =
    jornadaActiva && pausaActiva
      ? "En pausa"
      : jornadaActiva
        ? "En curso"
        : "Sin turno";

  const turnoBadgeStyle =
    jornadaActiva && pausaActiva
      ? "bg-amber-400/20 text-amber-100"
      : jornadaActiva
        ? "bg-emerald-400/20 text-emerald-100"
        : "bg-white/10 text-white/70";

  return (
    <div className="space-y-10">
      <section className="hidden space-y-6 md:block">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
              {monthTitle}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)]"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)]"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="ml-2 rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text-secondary)]"
                onClick={() => setViewDate(new Date())}
              >
                Hoy
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-1 text-xs font-semibold text-[color:var(--text-muted)]">
              {(["mes", "semana", "dia"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-full px-3 py-1 transition ${
                    viewMode === mode
                      ? "bg-white text-[color:var(--text-primary)] shadow"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  {mode === "mes" ? "Mes" : mode === "semana" ? "Semana" : "Dia"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleSolicitar("ausencia")}
              className="flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:bg-sky-600"
            >
              <Plus size={16} />
              Solicitar Ausencia
            </button>
          </div>
        </header>

        <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase text-[color:var(--text-muted)]">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center ${
                  index >= 5 ? "text-sky-500" : "text-[color:var(--text-muted)]"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-px rounded-[24px] bg-[color:var(--card-border)]">
            {cells.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[120px] bg-[color:var(--surface-muted)]"
                  />
                );
              }
              const dateKey = buildDateKey(date);
              const events = eventsByDay.get(dateKey) ?? [];
              const selected = isInRange(date);
              const isToday = dateKey === todayKey;
              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`flex min-h-[120px] flex-col gap-2 bg-[color:var(--card)] p-3 text-left transition ${
                    selected ? "bg-sky-50" : "hover:bg-[color:var(--surface-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold ${
                        isToday ? "text-sky-600" : "text-[color:var(--text-secondary)]"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 2).map((event, idx) => (
                      <span
                        key={`${dateKey}-${event.type}-${idx}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${eventPillStyles[event.type]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[event.type]}`} />
                        {event.type === "fichaje" ? event.time ?? event.label : event.label}
                      </span>
                    ))}
                    {events.length > 2 && (
                      <span className="text-[10px] text-[color:var(--text-muted)]">
                        +{events.length - 2} mas
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[color:var(--card-border)] bg-[color:var(--card)] px-6 py-4 text-xs text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Fichajes
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Vacaciones
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Ausencias / Faltas
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-semibold text-[color:var(--text-primary)]">
            <div>
              <p className="text-[10px] font-semibold uppercase text-[color:var(--text-muted)]">
                Dias fichados
              </p>
              <p className="text-sm">{fichajeDays.size}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-[color:var(--text-muted)]">
                Vacaciones aprobadas
              </p>
              <p className="text-sm">{vacacionesDays.size}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 md:hidden">
        <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[color:var(--text-primary)]">
                {monthTitle}
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-sky-500"
                onClick={() => setViewDate(new Date())}
              >
                Seleccionar mes
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSolicitar("ausencia")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-[10px] font-semibold text-[color:var(--text-muted)]">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center ${
                  index >= 5 ? "text-sky-500" : "text-[color:var(--text-muted)]"
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((date, index) => {
              if (!date) {
                return <div key={`mobile-empty-${index}`} />;
              }
              const dateKey = buildDateKey(date);
              const markers = [
                fichajeDays.has(dateKey) ? dotStyles.fichaje : null,
                vacacionesDays.has(dateKey) ? dotStyles.vacaciones : null,
                ausenciaDays.has(dateKey) ? dotStyles.ausencia : null,
              ].filter(Boolean) as string[];
              const isSelected = sameDay(date, selectedDate);
              const isToday = dateKey === todayKey;
              return (
                <button
                  type="button"
                  key={`mobile-${date.toISOString()}`}
                  onClick={() => handleDayClick(date)}
                  className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold ${
                    isSelected
                      ? "bg-sky-500 text-white"
                      : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)]"
                  } ${isToday ? "ring-2 ring-sky-200" : ""}`}
                >
                  <span>{date.getDate()}</span>
                  {markers.length > 0 && (
                    <span className="mt-1 flex items-center gap-1">
                      {markers.map((color, idx) => (
                        <span
                          key={`${dateKey}-${color}-${idx}`}
                          className={`h-1.5 w-1.5 rounded-full ${color}`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-[color:var(--text-primary)]">
                Eventos de hoy
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">{selectedLabel}</p>
            </div>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
              No hay eventos registrados para esta fecha.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event, index) => (
                <div
                  key={`${selectedKey}-${event.type}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${eventPillStyles[event.type]}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${dotStyles[event.type]}`} />
                    </span>
                    <div>
                      <p className="font-semibold text-[color:var(--text-primary)]">
                        {event.type === "fichaje" ? "Entrada" : event.label}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {event.time ?? "Sin hora"}
                      </p>
                    </div>
                  </div>
                  {event.time && (
                    <span className="text-xs font-semibold text-sky-600">
                      {event.time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Turno actual
            </p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${turnoBadgeStyle}`}>
              {turnoBadge}
            </span>
          </div>
          <div className="mt-4 text-4xl font-semibold">
            <FichajeTimer
              startIso={jornadaEntradaIso}
              pauseAccumulatedMs={pauseAccumulatedMs}
              pauseStartIso={pauseStartIso}
              className="text-4xl font-semibold text-white"
            />
          </div>
          <p className="mt-2 text-xs text-white/60">Horas trabajadas hoy</p>
        </div>
      </section>

      <section
        id={vacacionesAnchorId}
        className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
              Solicitudes
            </p>
            <h3 className="text-2xl font-semibold text-[color:var(--text-primary)]">
              Nueva solicitud
            </h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Gestiona vacaciones y ausencias desde un mismo panel.
            </p>
          </div>
          <div className="flex items-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setTab("vacaciones")}
              className={`rounded-full px-4 py-2 transition ${
                tab === "vacaciones"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-200/60"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              Vacaciones
            </button>
            <button
              type="button"
              onClick={() => setTab("ausencia")}
              className={`rounded-full px-4 py-2 transition ${
                tab === "ausencia"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-200/60"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              Ausencias
            </button>
          </div>
        </div>

        {tab === "vacaciones" ? (
          <form action={vacAction} className="mt-6 space-y-4">
            <input type="hidden" name="inicio" value={startValue} />
            <input type="hidden" name="fin" value={endValue} />
            <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--text-secondary)]">
              {rangeStart
                ? `Rango seleccionado: ${startValue}${endValue ? ` hasta ${endValue}` : ""}`
                : "Selecciona fechas en el calendario para continuar."}
            </div>
            <textarea
              name="motivo"
              rows={3}
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Comentario opcional"
            />
            <button
              type="submit"
              disabled={!rangeStart}
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar solicitud
            </button>
            {vacState.status !== "idle" && (
              <p
                className={`text-sm ${
                  vacState.status === "success" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {vacState.message}
              </p>
            )}
          </form>
        ) : (
          <form action={ausAction} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
                  Tipo de ausencia
                </label>
                <div className="flex gap-3">
                  <label className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)]">
                    <input
                      type="radio"
                      name="ausenciaTipo"
                      value="FALTA"
                      className="hidden"
                      defaultChecked
                    />
                    Falta
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)]">
                    <input type="radio" name="ausenciaTipo" value="AVISO" className="hidden" />
                    Aviso
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
                  Desde
                </label>
                <input
                  name="inicio"
                  type="date"
                  required
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
                  Hasta
                </label>
                <input
                  name="fin"
                  type="date"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
                  Motivo
                </label>
                <textarea
                  name="motivo"
                  rows={3}
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Describe brevemente el motivo..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110"
            >
              Enviar solicitud
            </button>
            {ausState.status !== "idle" && (
              <p
                className={`text-sm ${
                  ausState.status === "success" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {ausState.message}
              </p>
            )}
          </form>
        )}
      </section>

      <section className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
              Solicitudes recientes
            </h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Resumen de tus ultimas solicitudes.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[color:var(--text-secondary)]">
            <span className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-1">
              Vacaciones: {vacacionesCount}
            </span>
            <span className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-1">
              Ausencias: {ausenciasCount}
            </span>
            <span className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-1">
              Pendientes: {pendientesCount}
            </span>
          </div>
        </div>
        {solicitudes.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--text-muted)]">
            No hay solicitudes registradas.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {solicitudes.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-secondary)]"
              >
                <div>
                  <p className="font-semibold text-[color:var(--text-primary)]">
                    {item.tipo === "VACACIONES" ? "Vacaciones" : "Ausencia"}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {formatRange(item)}
                  </p>
                  {item.tipo === "AUSENCIA" && item.ausenciaTipo && (
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {item.ausenciaTipo === "FALTA" ? "He faltado" : "Voy a faltar"}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.estado]}`}
                >
                  {statusLabel[item.estado]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
