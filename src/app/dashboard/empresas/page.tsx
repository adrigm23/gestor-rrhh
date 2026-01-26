import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import EmpresaForm from "./empresa-form";

export default async function EmpresasPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "ADMIN_SISTEMA") {
    redirect("/dashboard");
  }

  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      cif: true,
      plan: true,
      createdAt: true,
      _count: { select: { usuarios: true, departamentos: true, centrosTrabajo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-teal-500/70">
            Administracion
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Empresas</h2>
        </div>
        <a
          href="#crear-empresa"
          className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-200/60"
        >
          Crear empresa
        </a>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <EmpresaForm />

        <div className="mt-10 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Empresas registradas</span>
            <span>{empresas.length}</span>
          </div>
          {empresas.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No hay empresas registradas.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold">CIF</th>
                    <th className="px-4 py-3 text-left font-semibold">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuarios</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Departamentos
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Centros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {empresa.nombre}
                      </td>
                      <td className="px-4 py-3 uppercase">{empresa.cif}</td>
                      <td className="px-4 py-3">{empresa.plan}</td>
                      <td className="px-4 py-3">{empresa._count.usuarios}</td>
                      <td className="px-4 py-3">
                        {empresa._count.departamentos}
                      </td>
                      <td className="px-4 py-3">
                        {empresa._count.centrosTrabajo}
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
