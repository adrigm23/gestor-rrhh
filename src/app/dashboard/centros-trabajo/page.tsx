import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import { crearCentroTrabajo } from "../../actions/organizacion-actions";

export default async function CentrosTrabajoPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "EMPLEADO") {
    redirect("/dashboard");
  }

  const role = session.user?.role ?? "";
  const gerenteEmpresaId =
    role === "GERENTE"
      ? (
          await prisma.usuario.findUnique({
            where: { id: session.user?.id ?? "" },
            select: { empresaId: true },
          })
        )?.empresaId ?? null
      : null;

  const empresas =
    role === "ADMIN_SISTEMA"
      ? await prisma.empresa.findMany({
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [];

  const gerentes = await prisma.usuario.findMany({
    where: {
      rol: "GERENTE",
      ...(gerenteEmpresaId ? { empresaId: gerenteEmpresaId } : {}),
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      empresa: { select: { nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const centros = await prisma.centroTrabajo.findMany({
    where: gerenteEmpresaId ? { empresaId: gerenteEmpresaId } : undefined,
    include: {
      gerente: { select: { nombre: true } },
      empresa: { select: { nombre: true } },
      _count: { select: { departamentos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-500/70">
            Administracion
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">
            Centros de trabajo
          </h2>
        </div>
        <a
          href="#crear-centro"
          className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-200/60"
        >
          Crear centro de trabajo
        </a>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <form
          id="crear-centro"
          action={crearCentroTrabajo}
          className="space-y-6"
        >
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Crear centro de trabajo
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Organiza los departamentos dentro de un centro.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nombre</label>
              <input
                name="nombre"
                type="text"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Ej: Planta Norte"
              />
            </div>
            {role === "ADMIN_SISTEMA" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Empresa</label>
                <select
                  name="empresaId"
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
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Gerente
              </label>
              <select
                name="gerenteId"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Sin gerente</option>
                {gerentes.map((gerente) => (
                  <option key={gerente.id} value={gerente.id}>
                    {gerente.nombre}
                    {role === "ADMIN_SISTEMA"
                      ? ` - ${gerente.empresa?.nombre ?? "Empresa"}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-200/70 transition hover:brightness-110"
          >
            Guardar centro
          </button>
        </form>

        <div className="mt-10 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Centros registrados</span>
            <span>{centros.length}</span>
          </div>
          {centros.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No hay centros registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold">Gerente</th>
                    {role === "ADMIN_SISTEMA" && (
                      <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold">Departamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centros.map((centro) => (
                    <tr key={centro.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {centro.nombre}
                      </td>
                      <td className="px-4 py-3">
                        {centro.gerente?.nombre ?? "Sin gerente"}
                      </td>
                      {role === "ADMIN_SISTEMA" && (
                        <td className="px-4 py-3">
                          {centro.empresa?.nombre ?? "Sin empresa"}
                        </td>
                      )}
                      <td className="px-4 py-3">{centro._count.departamentos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
