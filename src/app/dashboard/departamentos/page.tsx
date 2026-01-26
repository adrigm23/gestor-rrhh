import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import DepartamentoForm from "./departamento-form";

export default async function DepartamentosPage() {
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

  const centros = await prisma.centroTrabajo.findMany({
    where: gerenteEmpresaId ? { empresaId: gerenteEmpresaId } : undefined,
    select: {
      id: true,
      nombre: true,
      empresa: { select: { nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

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

  const departamentos = await prisma.departamento.findMany({
    where: gerenteEmpresaId ? { empresaId: gerenteEmpresaId } : undefined,
    include: {
      gerente: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
      empresa: { select: { nombre: true } },
      _count: { select: { empleados: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Administracion
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Departamentos</h2>
        </div>
        <a
          href="#crear-departamento"
          className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-200/60"
        >
          Crear departamento
        </a>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <DepartamentoForm
          role={role}
          empresas={empresas}
          centros={centros}
          gerentes={gerentes}
        />

        <div className="mt-10 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Departamentos registrados</span>
            <span>{departamentos.length}</span>
          </div>
          {departamentos.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No hay departamentos registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold">Gerente</th>
                    <th className="px-4 py-3 text-left font-semibold">Centro</th>
                    {role === "ADMIN_SISTEMA" && (
                      <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold">Empleados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departamentos.map((departamento) => (
                    <tr key={departamento.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {departamento.nombre}
                      </td>
                      <td className="px-4 py-3">
                        {departamento.gerente?.nombre ?? "Sin gerente"}
                      </td>
                      <td className="px-4 py-3">
                        {departamento.centroTrabajo?.nombre ?? "Sin centro"}
                      </td>
                      {role === "ADMIN_SISTEMA" && (
                        <td className="px-4 py-3">
                          {departamento.empresa?.nombre ?? "Sin empresa"}
                        </td>
                      )}
                      <td className="px-4 py-3">{departamento._count.empleados}</td>
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

