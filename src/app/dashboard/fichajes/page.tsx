import { Prisma, TipoFichaje } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import ExportAsyncPanel from "./export-async-panel";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatDuration = (entrada: Date, salida?: Date | null) => {
  if (!salida) return "En curso";
  const diffMs = Math.max(0, salida.getTime() - entrada.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return `${padded(hours)}:${padded(minutes)} Hrs`;
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

const toTipoFichaje = (value: string) => {
  const allowed: TipoFichaje[] = ["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"];
  return allowed.includes(value as TipoFichaje)
    ? (value as TipoFichaje)
    : undefined;
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
  const isGerente = role === "GERENTE";

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

  const resolvedSearchParams = (await searchParams) ?? {};
  const fromParam = getParam(resolvedSearchParams.from) ?? defaultFrom;
  const toParam = getParam(resolvedSearchParams.to) ?? defaultTo;
  const estadoParam = getParam(resolvedSearchParams.estado) ?? "todos";
  const tipoParam = getParam(resolvedSearchParams.tipo) ?? "todos";
  const empresaParam = getParam(resolvedSearchParams.empresaId) ?? "";
  const empleadoParam = getParam(resolvedSearchParams.empleadoId) ?? "";

  const empresaFiltro = isAdmin ? empresaParam : gerenteEmpresaId ?? "";
  const canQuery = isAdmin || !!empresaFiltro;
  const canExport = !!empresaFiltro;

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

  const whereClause: Prisma.FichajeWhereInput = {};

  if (empresaFiltro) {
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
    const tipo = toTipoFichaje(tipoParam);
    if (tipo) {
      whereClause.tipo = tipo;
    }
  }

  type FichajeConUsuario = Prisma.FichajeGetPayload<{
    include: {
      usuario: {
        select: {
          nombre: true;
          email: true;
          empresa: { select: { nombre: true } };
        };
      };
    };
  }>;

  const fichajes: FichajeConUsuario[] = canQuery
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

  const exportFilters = {
    from: fromParam,
    to: toParam,
    estado: estadoParam,
    tipo: tipoParam,
    empresaId: empresaFiltro,
    empleadoId: empleadoParam,
  };

  const empresaLabel =
    isAdmin && empresaFiltro
      ? empresas.find((empresa) => empresa.id === empresaFiltro)?.nombre ?? "Empresa"
      : isAdmin
        ? "Todas las empresas"
        : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Validacion
          </p>
          <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
            Validacion de fichajes
          </h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Revisa, valida y exporta las horas trabajadas del personal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/dashboard/modificacion-fichajes"
            className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
          >
            Modificar fichajes
          </a>
          <ExportAsyncPanel
            filters={exportFilters}
            canExport={canExport}
            showEmpresas={isAdmin || isGerente}
            formId="fichajes-filtros"
          />
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        <form
          id="fichajes-filtros"
          method="get"
          className="grid grid-cols-1 gap-5 lg:grid-cols-12"
        >
          {isAdmin ? (
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
                Empresa
              </label>
              <select
                name="empresaId"
                defaultValue={empresaParam}
                className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Todas las empresas</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[color:var(--text-muted)]">
                Opcional: si no eliges una empresa se muestran todas.
              </p>
            </div>
          ) : (
            <input type="hidden" name="empresaId" value={empresaFiltro} />
          )}

          <div className="space-y-2 lg:col-span-3">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Empleado
            </label>
            <select
              name="empleadoId"
              defaultValue={empleadoParam}
              disabled={!empresaFiltro}
              className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-[color:var(--surface-muted)]"
            >
              <option value="">Todos</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.nombre} - {empleado.email}
                </option>
              ))}
            </select>
            {!empresaFiltro && (
              <p className="text-xs text-[color:var(--text-muted)]">
                Selecciona una empresa y aplica filtros para cargar empleados.
              </p>
            )}
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Estado
            </label>
            <select
              name="estado"
              defaultValue={estadoParam}
              className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="todos">Todos</option>
              <option value="abierto">Abierto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Tipo
            </label>
            <select
              name="tipo"
              defaultValue={tipoParam}
              className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="todos">Todos</option>
              <option value="JORNADA">Jornada</option>
              <option value="PAUSA_COMIDA">Pausa comida</option>
              <option value="DESCANSO">Descanso</option>
              <option value="MEDICO">Medico</option>
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Desde
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fromParam}
              className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Hasta
            </label>
            <input
              type="date"
              name="to"
              defaultValue={toParam}
              className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-12">
            <a
              href="/dashboard/fichajes"
              className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
            >
              Limpiar filtros
            </a>
            <button
              type="submit"
              className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:bg-sky-600"
            >
              Aplicar filtros
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        {!canQuery ? (
          <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] p-6 text-sm text-[color:var(--text-muted)]">
            No tienes una empresa asignada para consultar fichajes.
          </div>
        ) : fichajes.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] p-6 text-sm text-[color:var(--text-muted)]">
            No hay fichajes en el periodo seleccionado.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-[color:var(--text-muted)]">
              <span>{empresaLabel ? `Empresa: ${empresaLabel}` : "Resultados"}</span>
              <span>{total}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[color:var(--card-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[color:var(--surface-muted)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold">Entrada</th>
                    <th className="px-4 py-3 text-left font-semibold">Salida</th>
                    <th className="px-4 py-3 text-left font-semibold">Total</th>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold">Editado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--card-border)]">
                  {fichajes.map((fichaje) => (
                    <tr key={fichaje.id} className="text-[color:var(--text-secondary)]">
                      <td className="px-4 py-3 font-semibold text-[color:var(--text-primary)]">
                        <div>{fichaje.usuario.nombre}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">
                          {fichaje.usuario.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.entrada.toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.entrada.toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {fichaje.salida
                          ? fichaje.salida.toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--"}
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
                          {fichaje.salida ? "Validado" : "Pendiente"}
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
