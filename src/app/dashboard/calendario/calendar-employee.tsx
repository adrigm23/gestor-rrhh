"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlaneTakeoff,
} from "lucide-react";
import {
  notificarAusencia,
  solicitarVacaciones,
  type SolicitudState,
} from "../../actions/solicitudes-actions";

export type SolicitudResumen = {
  id: string;
  tipo: "VACACIONES" | "AUSENCIA";
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  inicio: string;
  fin: string | null;
  createdAt: string;
  motivo: string | null;
};

type CalendarioEmpleadoProps = {
  solicitudes: SolicitudResumen[];
};

type FechaSeleccion = Date | null;

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
};

export default function CalendarioEmpleado({
  solicitudes,
}: CalendarioEmpleadoProps) {
  const [tab, setTab] = useState<"vacaciones" | "ausencia">("vacaciones");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<FechaSeleccion>(null);
  const [rangeEnd, setRangeEnd] = useState<FechaSeleccion>(null);

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

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month, 1));
  }, [month, year]);

  const startValue = rangeStart ? formatDateInput(rangeStart) : "";
  const endValue = rangeEnd ? formatDateInput(rangeEnd) : "";

  const handleDayClick = (date: Date) => {
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

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Calendario
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">
            Vacaciones y Ausencias
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTab("vacaciones")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === "vacaciones"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-200/70"
                : "border border-teal-400 text-teal-600"
            }`}
          >
            <CalendarDays size={16} />
            Vacaciones
          </button>
          <button
            type="button"
            onClick={() => setTab("ausencia")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === "ausencia"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-200/70"
                : "border border-teal-400 text-teal-600"
            }`}
          >
            <PlaneTakeoff size={16} />
            Ausencias
          </button>
        </div>
      </header>

      {tab === "vacaciones" && (
        <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Selecciona un rango para solicitar vacaciones.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500"
                onClick={() =>
                  setViewDate(new Date(year, month - 1, 1))
                }
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[140px] text-center font-medium capitalize text-slate-700">
                {monthLabel}
              </span>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500"
                onClick={() =>
                  setViewDate(new Date(year, month + 1, 1))
                }
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-xs text-slate-500">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-semibold uppercase">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {cells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} />;
              }
              const selected = isInRange(date);
              const isStart = rangeStart ? sameDay(date, rangeStart) : false;
              const isEnd = rangeEnd ? sameDay(date, rangeEnd) : false;

              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`flex h-11 items-center justify-center rounded-2xl text-sm font-medium transition ${
                    selected
                      ? "bg-sky-100 text-sky-700"
                      : "text-slate-600 hover:bg-slate-100"
                  } ${isStart || isEnd ? "ring-2 ring-sky-400" : ""}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <form action={vacAction} className="mt-8 space-y-4">
            <input type="hidden" name="inicio" value={startValue} />
            <input type="hidden" name="fin" value={endValue} />
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600">
              {rangeStart
                ? `Rango seleccionado: ${startValue}${
                    endValue ? ` hasta ${endValue}` : ""
                  }`
                : "Selecciona fechas en el calendario para continuar."}
            </div>
            <textarea
              name="motivo"
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Comentario opcional"
            />
            <button
              type="submit"
              disabled={!rangeStart}
              className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar solicitud
            </button>
            {vacState.status !== "idle" && (
              <p
                className={`text-sm ${
                  vacState.status === "success"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {vacState.message}
              </p>
            )}
          </form>
        </section>
      )}

      {tab === "ausencia" && (
        <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <form
            action={ausAction}
            encType="multipart/form-data"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Fecha de inicio (obligatorio)
                </label>
                <input
                  name="inicio"
                  type="date"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Fecha de fin (si es mas de un dia)
                </label>
                <input
                  name="fin"
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Motivo
                </label>
                <select
                  name="motivo"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Medico">Medico</option>
                  <option value="Personal">Personal</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Justificante
                </label>
                <input
                  name="justificante"
                  type="file"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110"
            >
              Enviar ausencia
            </button>
            {ausState.status !== "idle" && (
              <p
                className={`text-sm ${
                  ausState.status === "success"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {ausState.message}
              </p>
            )}
          </form>
        </section>
      )}

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <h3 className="text-lg font-semibold text-slate-900">
          Solicitudes recientes
        </h3>
        {solicitudes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No hay solicitudes registradas.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {solicitudes.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-600"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {item.tipo === "VACACIONES" ? "Vacaciones" : "Ausencia"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatRange(item)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.estado]}`}
                >
                  {item.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

