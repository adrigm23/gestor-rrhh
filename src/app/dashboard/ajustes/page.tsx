import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import AjustesForms from "./ajustes-forms";
import EmpresaConfigForm from "../empresas/empresa-config-form";

export default async function AjustesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user?.id ?? "" },
    include: {
      empresa: { select: { nombre: true, id: true, pausaCuentaComoTrabajo: true } },
      departamento: { select: { nombre: true } },
    },
  });

  if (!usuario) {
    redirect("/login");
  }

  const roleLabel =
    usuario.rol === "ADMIN_SISTEMA"
      ? "Administrador del sistema"
      : usuario.rol === "GERENTE"
        ? "Gerente"
        : "Empleado";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Sistema
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">Ajustes</h2>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Usuario
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {usuario.nombre}
            </p>
            <p className="text-sm text-slate-500">{usuario.email}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rol
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{roleLabel}</p>
            <p className="text-sm text-slate-500">
              {usuario.rol === "ADMIN_SISTEMA"
                ? "Control total del sistema"
                : "Acceso segun permisos asignados"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Empresa
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {usuario.empresa?.nombre ?? "Sin empresa"}
            </p>
            <p className="text-sm text-slate-500">
              {usuario.departamento?.nombre ?? "Sin departamento"}
            </p>
          </div>
        </div>
      </section>

      <AjustesForms nombre={usuario.nombre} email={usuario.email} />

      {usuario.rol === "GERENTE" && usuario.empresa && (
        <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <h3 className="text-lg font-semibold text-slate-900">
            Configuracion de empresa
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Define si la pausa cuenta como tiempo trabajado para tu empresa.
          </p>
          <div className="mt-6 max-w-sm">
            <EmpresaConfigForm
              empresaId={usuario.empresa.id}
              pausaCuentaComoTrabajo={usuario.empresa.pausaCuentaComoTrabajo}
            />
          </div>
        </section>
      )}
    </div>
  );
}

