import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import CreateUserForm from "./create-user-form";
import { prisma } from "../../lib/prisma";
import NfcAssignForm from "./nfc-assign-form";
import EmpresaAssignForm from "./empresa-assign-form";
import ContratoForm from "./contrato-form";

type SearchParams = Record<string, string | string[] | undefined>;

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function EmpleadosPage({
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
  const query = (getParam(searchParams.q) ?? "").trim();
  const gerenteEmpresaId =
    role === "GERENTE"
      ? (
          await prisma.usuario.findUnique({
            where: { id: session.user?.id ?? "" },
            select: { empresaId: true },
          })
        )?.empresaId ?? null
      : null;

  const usuarios = await prisma.usuario.findMany({
    where:
      role === "ADMIN_SISTEMA"
        ? {
            rol: { in: ["EMPLEADO", "GERENTE"] },
            ...(query
              ? {
                  OR: [
                    { nombre: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
          }
        : gerenteEmpresaId
          ? {
              rol: "EMPLEADO",
              empresaId: gerenteEmpresaId,
              ...(query
                ? {
                    OR: [
                      { nombre: { contains: query, mode: "insensitive" } },
                      { email: { contains: query, mode: "insensitive" } },
                    ],
                  }
                : {}),
            }
          : { rol: "EMPLEADO", id: "__none__" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      createdAt: true,
      nfcUidHash: true,
      empresaId: true,
      empresa: { select: { nombre: true } },
      departamento: { select: { nombre: true } },
      contratos: {
        orderBy: { fechaInicio: "desc" },
        take: 1,
        select: { horasSemanales: true, fechaInicio: true },
      },
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
    select: {
      id: true,
      nombre: true,
      empresaId: true,
      empresa: { select: { nombre: true } },
    },
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
          <CreateUserForm empresas={empresas} departamentos={departamentos} />
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-sm text-slate-600">
            La creacion de usuarios esta reservada al administrador del sistema.
          </div>
        )}

        <form
          method="get"
          className="mt-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"
        >
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar usuario por nombre o email"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Buscar
          </button>
        </form>
        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Usuarios registrados</span>
            <span>{usuarios.length}</span>
          </div>
          {usuarios.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No hay usuarios registrados en esta empresa.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Rol</th>
                    <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Departamento
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Contrato
                    </th>
                    {role === "ADMIN_SISTEMA" && (
                      <th className="px-4 py-3 text-left font-semibold">
                        Tarjeta
                      </th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold">
                      Alta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {usuario.nombre}
                      </td>
                      <td className="px-4 py-3">{usuario.email}</td>
                      <td className="px-4 py-3">
                        {usuario.rol === "GERENTE" ? "Gerente" : "Empleado"}
                      </td>
                      <td className="px-4 py-3">
                        {role === "ADMIN_SISTEMA" ? (
                          <EmpresaAssignForm
                            usuarioId={usuario.id}
                            empresaIdActual={usuario.empresaId}
                            empresas={empresas}
                          />
                        ) : (
                          usuario.empresa?.nombre ?? "Sin empresa"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {usuario.departamento?.nombre ?? "Sin departamento"}
                      </td>
                      <td className="px-4 py-3">
                        <ContratoForm
                          usuarioId={usuario.id}
                          horasActuales={usuario.contratos[0]?.horasSemanales ?? null}
                          fechaInicioActual={
                            usuario.contratos[0]?.fechaInicio
                              ? usuario.contratos[0].fechaInicio.toISOString().slice(0, 10)
                              : null
                          }
                        />
                      </td>
                      {role === "ADMIN_SISTEMA" && (
                        <td className="px-4 py-3">
                          <NfcAssignForm
                            usuarioId={usuario.id}
                            tieneTarjeta={Boolean(usuario.nfcUidHash)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {usuario.createdAt.toLocaleDateString("es-ES")}
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

