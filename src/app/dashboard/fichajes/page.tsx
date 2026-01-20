import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";

type SearchParams = {
  from?: string;
  to?: string;
  empleadoId?: string;
  empresaId?: string;
  estado?: string;
  tipo?: string;
};

const formatDuration = (entrada: Date, salida?: Date | null) => {
  if (!salida) return "En curso";
  const diffMs = Math.max(0, salida.getTime() - entrada.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return `${padded(hours)}:${padded(minutes)} Hrs`;
};

const formatTipo = (tipo: string) => {
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

export default async function FichajesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "EMPLEADO") {
    redirect("/dashboard");
  }

  const role = session.user?.role ?? "";
  const isAdmin = role === "ADMIN_SISTEMA";

  const gerenteEmpresaId =
    role === "GERENTE"
      ? (
          await prisma.usuario.findUnique({
            where: { id: session.user?.id ?? "" },
            select: { empresaId: true },
          })
        )?.empresaId ?? null
      : null;

  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(today.getDate() - 7);
  const defaultFrom = defaultFromDate.toISOString().slice(0, 10);

  const fromParam = searchParams.from ?? defaultFrom;
  const toParam = searchParams.to ?? defaultTo;
  const estadoParam = searchParams.estado ?? "todos";
  const tipoParam = searchParams.tipo ?? "todos";
  const empresaParam = searchParams.empresaId ?? "";
  const empleadoParam = searchParams.empleadoId ?? "";

  const empresaFiltro = isAdmin ? empresaParam : gerenteEmpresaId ?? "";

  const parseDate = (value: string, endOfDay: boolean) => {
    if (!value) return null;
    const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
    const date = new Date(`${value}${suffix}`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  let desde = parseDate(fromParam, false);
  let hasta = parseDate(toParam, true);
  if (desde && hasta && hasta < desde) {
    const temp = desde;
    desde = hasta;
    hasta = temp;
  }

  const empresas = isAdmin
    ? await prisma.empresa.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  const empleados = empresaFiltro
    ? await prisma.usuario.findMany({
        where: { rol: "EMPLEADO", empresaId: empresaFiltro },
        select: { id: true, nombre: true, email: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  const canQuery = !!empresaFiltro;

  const whereClause: {
    usuario?: { empresaId?: string };
    usuarioId?: string;
    entrada?: { gte?: Date; lte?: Date };
    salida?: { equals?: null | Date; not?: null };
    tipo?: string;
  } = {};

  if (canQuery) {
    whereClause.usuario = { empresaId: empresaFiltro };
  }

  if (empleadoParam) {
    whereClause.usuarioId = empleadoParam;
  }

  if (desde || hasta) {
    whereClause.entrada = {
      ...(desde ? { gte: desde } : {}),
      ...(hasta ? { lte: hasta } : {}),
    };
  }

  if (estadoParam === "abierto") {
    whereClause.salida = { equals: null };
  } else if (estadoParam === "cerrado") {
    whereClause.salida = { not: null };
  }

  if (tipoParam !== "todos") {
    whereClause.tipo = tipoParam;
  }

  const fichajes = canQuery
    ? await prisma.fichaje.findMany({
        where: whereClause,
        include: {
          usuario: {
            select: {
              nombre: true,
              email: true,
              empresa: { select: { nombre: true } },
            },
          },
        },
        orderBy: { entrada: "desc" },
        take: 200,
      })
    : [];

  const total = canQuery
    ? await prisma.fichaje.count({ where: whereClause })
    : 0;

  const exportParams = new URLSearchParams();
  if (fromParam) exportParams.set("from", fromParam);
  if (toParam) exportParams.set("to", toParam);
  if (estadoParam !== "todos") exportParams.set("estado", estadoParam);
  if (tipoParam !== "todos") exportParams.set("tipo", tipoParam);
  if (empresaFiltro) exportParams.set("empresaId", empresaFiltro);
  if (empleadoParam) exportParams.set("empleadoId", empleadoParam);
  const exportHref = `/api/fichajes/export?${exportParams.toString()}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-500/70">
            Validacion
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Fichajes</h2>
        </div>
        <div className="flex items-center gap-3">
          {canQuery ? (
            <a
              href={exportHref}
              className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-200/60"
            >
              Descargar informe
            </a>
          ) : (
            <button
              disabled
              className="cursor-not-allowed rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-white/80"
            >
              Descargar informe
            </button>
          )}
          <a
            href="#filtros"
            className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-200/60"
          >
            Filtros
          </a>
        </div>
      </header>

      <section
        id="filtros"
        className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
      >
        <form method="get" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {isAdmin ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Empresa
                </label>
                <select
                  name="empresaId"
                  defaultValue={empresaParam}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Selecciona empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="empresaId" value={empresaFiltro} />
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Empleado
              </label>
              <select
                name="empleadoId"
                defaultValue={empleadoParam}
                disabled={!empresaFiltro}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">Todos</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre} - {empleado.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Desde
              </label>
              <input
                type="date"
                name="from"
                defaultValue={fromParam}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Hasta
              </label>
              <input
                type="date"
                name="to"
                defaultValue={toParam}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Estado
              </label>
              <select
                name="estado"
                defaultValue={estadoParam}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="todos">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Tipo
              </label>
              <select
                name="tipo"
                defaultValue={tipoParam}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="todos">Todos</option>
                <option value="JORNADA">Jornada</option>
                <option value="PAUSA_COMIDA">Pausa comida</option>
                <option value="DESCANSO">Descanso</option>
                <option value="MEDICO">Medico</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-200/70 transition hover:brightness-110"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        {!empresaFiltro && isAdmin ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6 text-sm text-slate-500">
            Selecciona una empresa para visualizar los fichajes.
          </div>
        ) : fichajes.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6 text-sm text-slate-500">
            No hay fichajes en el periodo seleccionado.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Fichajes encontrados</span>
              <span>{total}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                    <th className="px-4 py-3 text-left font-semibold">Entrada</th>
                    <th className="px-4 py-3 text-left font-semibold">Salida</th>
                    <th className="px-4 py-3 text-left font-semibold">Tiempo</th>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold">Editado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fichajes.map((fichaje) => (
                    <tr key={fichaje.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{fichaje.usuario.nombre}</div>
                        <div className="text-xs text-slate-400">
                          {fichaje.usuario.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.entrada.toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.salida
                          ? fichaje.salida.toLocaleString("es-ES")
                          : "En curso"}
                      </td>
                      <td className="px-4 py-3">
                        {formatDuration(fichaje.entrada, fichaje.salida)}
                      </td>
                      <td className="px-4 py-3">{formatTipo(fichaje.tipo)}</td>
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
                      <td className="px-4 py-3">
                        {fichaje.editado ? "Si" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
