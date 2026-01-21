import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import ModificacionFichajeForm from "./modificacion-fichaje-form";

export default async function ModificacionFichajesPage() {
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
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: "asc" },
  });

  const fichajes = await prisma.fichaje.findMany({
    where:
      role === "ADMIN_SISTEMA"
        ? {}
        : gerenteEmpresaId
          ? { usuario: { empresaId: gerenteEmpresaId } }
          : { usuarioId: "__none__" },
    select: {
      id: true,
      entrada: true,
      salida: true,
      usuario: { select: { nombre: true, email: true } },
    },
    orderBy: { entrada: "desc" },
    take: 50,
  });

  const solicitudes = await prisma.solicitudModificacionFichaje.findMany({
    where:
      role === "ADMIN_SISTEMA"
        ? {}
        : gerenteEmpresaId
          ? { empleado: { empresaId: gerenteEmpresaId } }
          : { empleadoId: "__none__" },
    include: {
      empleado: { select: { nombre: true, email: true } },
      solicitante: { select: { nombre: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Validacion
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">
          Modificacion de fichajes
        </h2>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <ModificacionFichajeForm
          empleados={empleados}
          fichajes={fichajes.map((fichaje) => ({
            id: fichaje.id,
            empleadoNombre: fichaje.usuario.nombre,
            empleadoEmail: fichaje.usuario.email,
            entrada: fichaje.entrada.toISOString(),
            salida: fichaje.salida ? fichaje.salida.toISOString() : null,
          }))}
        />

        <div className="mt-10 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Solicitudes recientes</span>
            <span>{solicitudes.length}</span>
          </div>

          {solicitudes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-sm text-slate-600">
              No hay solicitudes registradas.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                    <th className="px-4 py-3 text-left font-semibold">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Entrada propuesta
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Salida propuesta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id} className="text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {solicitud.empleado.nombre}
                      </td>
                      <td className="px-4 py-3">{solicitud.estado}</td>
                      <td className="px-4 py-3">
                        {solicitud.motivo ?? "Sin motivo"}
                      </td>
                      <td className="px-4 py-3">
                        {solicitud.entradaPropuesta
                          ? solicitud.entradaPropuesta.toLocaleString("es-ES")
                          : "Sin cambio"}
                      </td>
                      <td className="px-4 py-3">
                        {solicitud.salidaPropuesta
                          ? solicitud.salidaPropuesta.toLocaleString("es-ES")
                          : "Sin cambio"}
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

