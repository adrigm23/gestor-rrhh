import { TipoFichaje } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseDate = (value: string | undefined, endOfDay: boolean) => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

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

const formatHours = (ms: number) => {
  const totalHours = ms / 3600000;
  return `${totalHours.toFixed(2)} h`;
};

const formatTipo = (tipo: TipoFichaje) => {
  switch (tipo) {
    case "PAUSA_COMIDA":
      return "Pausa comida";
    case "DESCANSO":
      return "Descanso";
    case "MEDICO":
      return "Medico";
    default:
      return "Jornada";
  }
};

const formatDuration = (ms: number) => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return `${padded(hours)}:${padded(minutes)} Hrs`;
};

const clampRange = (start: Date, end: Date, now: Date) => {
  const safeEnd = end.getTime() > now.getTime() ? now : end;
  return { start, end: safeEnd };
};

export default async function EscritorioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "ADMIN_SISTEMA") {
    redirect("/dashboard/empleados");
  }

  const role = session.user?.role ?? "";
  const userId = session.user?.id ?? "";

  const now = new Date();
  const defaultStart = startOfWeek(now);
  const defaultEnd = endOfWeek(now);
  const defaultFromValue = defaultStart.toISOString().slice(0, 10);
  const defaultToValue = defaultEnd.toISOString().slice(0, 10);

  const fromParam = getParam(searchParams.from);
  const toParam = getParam(searchParams.to);
  const empleadoParam = getParam(searchParams.empleadoId);

  const fromValue = fromParam ?? defaultFromValue;
  const toValue = toParam ?? defaultToValue;

  const from = parseDate(fromValue, false) ?? defaultStart;
  const to = parseDate(toValue, true) ?? defaultEnd;

  const range = clampRange(from, to, now);

  const empresa = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      empresaId: true,
      empresa: { select: { nombre: true, pausaCuentaComoTrabajo: true } },
    },
  });

  if (!empresa?.empresaId) {
    return (
      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <p className="text-sm text-slate-500">
          No tienes empresa asociada.
        </p>
      </div>
    );
  }

  const empresaId = empresa.empresaId;
  const pausaCuenta = empresa.empresa?.pausaCuentaComoTrabajo ?? true;

  const empleados =
    role === "GERENTE"
      ? await prisma.usuario.findMany({
          where: { empresaId, rol: "EMPLEADO" },
          select: { id: true, nombre: true, email: true },
          orderBy: { nombre: "asc" },
        })
      : [];

  const empleadoId =
    role === "GERENTE" ? empleadoParam ?? empleados[0]?.id ?? "" : userId;

  const empleado = await prisma.usuario.findUnique({
    where: { id: empleadoId },
    select: { id: true, nombre: true, email: true },
  });

  if (!empleado) {
    return (
      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <p className="text-sm text-slate-500">Empleado no encontrado.</p>
      </div>
    );
  }

  const contrato = await prisma.contrato.findFirst({
    where: {
      usuarioId: empleadoId,
      fechaInicio: { lte: range.end },
      OR: [{ fechaFin: null }, { fechaFin: { gte: range.start } }],
    },
    orderBy: { fechaInicio: "desc" },
  });

  const fichajesResumen = await prisma.fichaje.findMany({
    where: {
      usuarioId: empleadoId,
      entrada: { lte: range.end },
      OR: [{ salida: null }, { salida: { gte: range.start } }],
    },
    orderBy: { entrada: "desc" },
  });

  const tableStart = startOfWeek(range.end);
  const tableEnd = endOfWeek(range.end);
  const tableRange = clampRange(tableStart, tableEnd, now);

  const fichajes = await prisma.fichaje.findMany({
    where: {
      usuarioId: empleadoId,
      entrada: { lte: tableRange.end },
      OR: [{ salida: null }, { salida: { gte: tableRange.start } }],
    },
    orderBy: { entrada: "desc" },
  });

  let jornadaMs = 0;
  let pausaMs = 0;

  for (const fichaje of fichajesResumen) {
    const start = Math.max(fichaje.entrada.getTime(), range.start.getTime());
    const end = Math.min(
      (fichaje.salida ?? now).getTime(),
      range.end.getTime(),
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
  const contratoHoras = contrato?.horasSemanales ?? null;
  const totalHoras = totalMs / 3600000;
  const progreso =
    contratoHoras && contratoHoras > 0
      ? Math.min(100, (totalHoras / contratoHoras) * 100)
      : null;

  const rangeLabel = `${range.start.toLocaleDateString("es-ES")} - ${range.end.toLocaleDateString("es-ES")}`;
  const tableLabel = `${tableRange.start.toLocaleDateString("es-ES")} - ${tableRange.end.toLocaleDateString("es-ES")}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Escritorio
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">
            Resumen de horas
          </h2>
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <form method="get" className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {role === "GERENTE" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Empleado
              </label>
              <select
                name="empleadoId"
                defaultValue={empleadoId}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {empleados.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} - {item.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Desde</label>
              <input
                type="date"
                name="from"
                defaultValue={fromValue}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Hasta</label>
              <input
                type="date"
                name="to"
                defaultValue={toValue}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110"
            >
              Aplicar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              {empresa.empresa?.nombre ?? "Empresa"}
            </p>
            <h3 className="text-2xl font-semibold text-slate-900">
              {empleado.nombre}
            </h3>
            <p className="text-sm text-slate-500">{empleado.email}</p>
            <p className="mt-1 text-xs text-slate-400">{rangeLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
            {pausaCuenta
              ? "La pausa cuenta como tiempo trabajado"
              : "La pausa NO cuenta como tiempo trabajado"}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(148,163,184,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Horas trabajadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {formatHours(totalMs)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(148,163,184,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Contrato semanal
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {contratoHoras ? `${contratoHoras.toFixed(2)} h` : "Sin contrato"}
            </p>
            {contrato?.fechaInicio && (
              <p className="mt-1 text-xs text-slate-400">
                Desde {contrato.fechaInicio.toLocaleDateString("es-ES")}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(148,163,184,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Progreso semana
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {progreso !== null ? `${progreso.toFixed(0)}%` : "--"}
            </p>
            {progreso !== null && (
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-teal-500"
                  style={{ width: `${Math.min(100, progreso)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Fichajes del tramo
          </h3>
          <div className="text-right text-xs text-slate-500">
            <div>{tableLabel}</div>
            <div>{fichajes.length} registros</div>
          </div>
        </div>

        {fichajes.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-6 text-sm text-slate-500">
            No hay fichajes en el periodo seleccionado.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Entrada</th>
                  <th className="px-4 py-3 text-left font-semibold">Salida</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Tiempo</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fichajes.map((fichaje) => {
                  const start = Math.max(
                    fichaje.entrada.getTime(),
                    range.start.getTime(),
                  );
                  const end = Math.min(
                    (fichaje.salida ?? now).getTime(),
                    range.end.getTime(),
                  );
                  const duration = Math.max(0, end - start);
                  return (
                    <tr key={fichaje.id} className="text-slate-600">
                      <td className="px-4 py-3">
                        {fichaje.entrada.toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.salida
                          ? fichaje.salida.toLocaleString("es-ES")
                          : "En curso"}
                      </td>
                      <td className="px-4 py-3">
                        {formatTipo(fichaje.tipo)}
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.salida ? formatDuration(duration) : "En curso"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            fichaje.salida
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {fichaje.salida ? "Cerrado" : "Abierto"}
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
  );
}
