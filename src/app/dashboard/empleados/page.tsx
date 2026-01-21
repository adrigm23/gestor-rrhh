import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { crearEmpleado } from "../../actions/admin-actions";
import { prisma } from "../../lib/prisma";

export default async function EmpleadosPage() {
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

  const empleados = await prisma.usuario.findMany({
    where:
      role === "ADMIN_SISTEMA"
        ? { rol: "EMPLEADO" }
        : gerenteEmpresaId
          ? { rol: "EMPLEADO", empresaId: gerenteEmpresaId }
          : { rol: "EMPLEADO", id: "__none__" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      createdAt: true,
      empresa: { select: { nombre: true } },
      departamento: { select: { nombre: true } },
    },
  });

  const departamentos = await prisma.departamento.findMany({
    where:
      role === "ADMIN_SISTEMA"
        ? {}
        : gerenteEmpresaId
          ? { empresaId: gerenteEmpresaId }
          : { id: "__none__" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, empresa: { select: { nombre: true } } },
  });

  const empresas =
    role === "ADMIN_SISTEMA"
      ? await prisma.empresa.findMany({
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Administracion
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Gestion de usuarios</h2>
        </div>
        {role === "ADMIN_SISTEMA" && (
          <a
            href="#crear-usuario"
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-200/60"
          >
            Crear usuario
          </a>
        )}
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        {role === "ADMIN_SISTEMA" ? (
          <form id="crear-usuario" action={crearEmpleado} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Crear empleado</h3>
              <p className="mt-1 text-sm text-slate-500">
                Solo el administrador puede crear usuarios para controlar la tarifa.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nombre completo</label>
                <input
                  name="nombre"
                  type="text"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Ej: Ana Ruiz"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="empleado@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Contrasena</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="********"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Empresa</label>
                <select
                  name="empresaId"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">Selecciona empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Departamento</label>
                <select
                  name="departamentoId"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">Sin departamento</option>
                  {departamentos.map((departamento) => (
                    <option key={departamento.id} value={departamento.id}>
                      {departamento.nombre}
                      {departamento.empresa?.nombre
                        ? ` - ${departamento.empresa.nombre}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110"
            >
              Crear usuario
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-sm text-slate-600">
            La creacion de usuarios esta reservada al administrador del sistema.
          </div>
        )}

        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            className="w-full bg-transparent outline-none"
            placeholder="Buscar empleado"
          />
        </div>
        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Empleados registrados</span>
            <span>{empleados.length}</span>
          </div>
          {empleados.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No hay empleados registrados en esta empresa.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Departamento
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Alta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empleados.map((empleado) => (
                    <tr key={empleado.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {empleado.nombre}
                      </td>
                      <td className="px-4 py-3">{empleado.email}</td>
                      <td className="px-4 py-3">
                        {empleado.empresa?.nombre ?? "Sin empresa"}
                      </td>
                      <td className="px-4 py-3">
                        {empleado.departamento?.nombre ?? "Sin departamento"}
                      </td>
                      <td className="px-4 py-3">
                        {empleado.createdAt.toLocaleDateString("es-ES")}
                      </td>
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

