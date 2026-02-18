"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Clock,
  Mail,
  MoreHorizontal,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import CreateUserPanel from "./create-user-panel";
import EmpresaAssignForm from "./empresa-assign-form";
import ContratoForm from "./contrato-form";
import PasswordResetForm from "./password-reset-form";
import NfcAssignForm from "./nfc-assign-form";
import UserStatusForm from "./user-status-form";
import EmailUpdateForm from "./email-update-form";

type EmpresaOption = {
  id: string;
  nombre: string;
};

type DepartamentoOption = {
  id: string;
  nombre: string;
  empresaId?: string | null;
  empresa?: { nombre?: string | null } | null;
};

type UsuarioItem = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  fechaBaja: Date | null;
  createdAt: Date;
  nfcUidHash: string | null;
  empresaId: string | null;
  empresa: { nombre: string | null } | null;
  departamento: { nombre: string | null } | null;
  contratos: { horasSemanales: number; fechaInicio: Date }[];
  passwordMustChange: boolean;
};

type EmpleadosDirectoryProps = {
  role: string;
  currentUserId: string;
  query: string;
  estadoParam: string;
  rolParam: string;
  empresaParam: string;
  usuarios: UsuarioItem[];
  empresas: EmpresaOption[];
  departamentos: DepartamentoOption[];
};

const roleBadge = (rol: string) => {
  if (rol === "GERENTE") return "bg-violet-100 text-violet-700";
  if (rol === "ADMIN_SISTEMA") return "bg-slate-200 text-slate-700";
  return "bg-sky-100 text-sky-700";
};

const roleLabel = (rol: string) => {
  if (rol === "GERENTE") return "Gerente";
  if (rol === "ADMIN_SISTEMA") return "Admin sistema";
  return "Empleado";
};

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export default function EmpleadosDirectory({
  role,
  currentUserId,
  query,
  estadoParam,
  rolParam,
  empresaParam,
  usuarios,
  empresas,
  departamentos,
}: EmpleadosDirectoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedUser = useMemo(
    () => usuarios.find((item) => item.id === selectedId) ?? null,
    [usuarios, selectedId],
  );

  useEffect(() => {
    if (!selectedId || selectedUser) return;
    setSelectedId(null);
  }, [selectedId, selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [selectedUser]);

  const isAdmin = role === "ADMIN_SISTEMA";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs text-[color:var(--text-muted)]">
            Inicio / Empleados
          </p>
          <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
            Directorio de Empleados
          </h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Gestiona los usuarios y accesos de todas las empresas cliente.
          </p>
        </div>
        {isAdmin && (
          <CreateUserPanel empresas={empresas} departamentos={departamentos} />
        )}
      </div>

      <form
        method="get"
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] px-4 py-4 shadow-[var(--shadow-soft)]"
      >
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-muted)]">
          <Search size={16} />
          <input
            type="text"
            name="q"
            defaultValue={query}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar por nombre, email o NFC..."
          />
        </div>

        {isAdmin && (
          <select
            name="empresaId"
            defaultValue={empresaParam}
            className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        )}

        {isAdmin && (
          <select
            name="rol"
            defaultValue={rolParam}
            className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
          >
            <option value="todos">Todos los roles</option>
            <option value="EMPLEADO">Empleados</option>
            <option value="GERENTE">Gerentes</option>
          </select>
        )}

        <select
          name="estado"
          defaultValue={estadoParam}
          className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
        >
          <option value="activos">Activos</option>
          <option value="baja">Baja</option>
          <option value="todos">Todos</option>
        </select>

        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Buscar
        </button>
      </form>

      <section className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[color:var(--card-border)] px-6 py-4 text-sm text-[color:var(--text-muted)]">
          <span>Usuarios registrados</span>
          <span>{usuarios.length}</span>
        </div>
        {usuarios.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[color:var(--text-muted)]">
            No hay usuarios registrados con los filtros actuales.
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 px-4 py-4">
              {usuarios.map((usuario) => {
                const initials = initialsFromName(usuario.nombre || "U");
                const horasContrato = usuario.contratos[0]?.horasSemanales ?? null;
                const departamento = usuario.departamento?.nombre ?? "Sin departamento";
                const empresa = usuario.empresa?.nombre ?? "Sin empresa";
                return (
                  <div
                    key={usuario.id}
                    className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                              {usuario.nombre}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadge(
                                usuario.rol,
                              )}`}
                            >
                              {roleLabel(usuario.rol)}
                            </span>
                            {!usuario.activo && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Baja
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            {usuario.email}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(usuario.id)}
                        className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                        aria-label="Editar usuario"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-[color:var(--text-muted)]">
                      {empresa} · {departamento}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-[color:var(--card-border)] px-3 py-1 text-[color:var(--text-secondary)]">
                        {horasContrato ? `${horasContrato}h/sem` : "Sin contrato"}
                      </span>
                      <span className="rounded-full border border-[color:var(--card-border)] px-3 py-1 text-[color:var(--text-secondary)]">
                        NFC: {usuario.nfcUidHash ? "Asignado" : "No asignado"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          usuario.passwordMustChange
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {usuario.passwordMustChange ? "Reset requerido" : "Password activo"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                <div className="grid grid-cols-[2.2fr_1.4fr_0.6fr_1.4fr_auto] gap-4">
                  <span>Usuario &amp; rol</span>
                  <span>Organizacion</span>
                  <span>Contrato</span>
                  <span>Seguridad</span>
                  <span className="text-right">Acciones</span>
                </div>
              </div>
              <div className="divide-y divide-[color:var(--card-border)]">
                {usuarios.map((usuario) => {
                  const initials = initialsFromName(usuario.nombre || "U");
                  const horasContrato = usuario.contratos[0]?.horasSemanales ?? null;
                  const departamento = usuario.departamento?.nombre ?? "Sin departamento";
                  const empresa = usuario.empresa?.nombre ?? "Sin empresa";
                  const passwordLabel = usuario.passwordMustChange
                    ? "Reset requerido"
                    : "Password activo";
                  const passwordClass = usuario.passwordMustChange
                    ? "text-amber-600"
                    : "text-emerald-600";
                  return (
                    <div
                      key={usuario.id}
                      className="grid grid-cols-[2.2fr_1.4fr_0.6fr_1.4fr_auto] gap-4 px-6 py-4 text-sm text-[color:var(--text-secondary)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[color:var(--text-primary)]">
                              {usuario.nombre}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadge(
                                usuario.rol,
                              )}`}
                            >
                              {roleLabel(usuario.rol)}
                            </span>
                            {!usuario.activo && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Baja
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            {usuario.email}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="inline-flex rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text-secondary)]">
                          {empresa}
                        </div>
                        <div className="text-xs text-[color:var(--text-muted)]">
                          {departamento}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {horasContrato ? `${horasContrato}h` : "Sin contrato"}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[color:var(--text-secondary)]">
                            NFC
                          </span>
                          <span className="text-[color:var(--text-muted)]">
                            {usuario.nfcUidHash ? "Asignado" : "No asignado"}
                          </span>
                        </div>
                        <div className={passwordClass}>{passwordLabel}</div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedId(usuario.id)}
                          className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                          aria-label="Editar usuario"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {selectedUser && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[color:var(--card-border)] bg-[color:var(--card)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--card-border)] px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">
                  Editar empleado
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
                  {selectedUser.nombre}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Gestion de acceso y configuracion
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full border border-[color:var(--card-border)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                aria-label="Cerrar panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600">
                  {initialsFromName(selectedUser.nombre || "U")}
                </div>
                <div>
                  <p className="text-base font-semibold text-[color:var(--text-primary)]">
                    {selectedUser.nombre}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <section className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                  <Briefcase size={16} />
                  Informacion laboral
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                      Empresa
                    </p>
                    {isAdmin ? (
                      <EmpresaAssignForm
                        usuarioId={selectedUser.id}
                        empresaIdActual={selectedUser.empresaId}
                        empresas={empresas}
                      />
                    ) : (
                      <div className="text-sm text-[color:var(--text-muted)]">
                        {selectedUser.empresa?.nombre ?? "Sin empresa"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                      Departamento
                    </p>
                    <div className="text-sm text-[color:var(--text-muted)]">
                      {selectedUser.departamento?.nombre ?? "Sin departamento"}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                  <Clock size={16} />
                  Contrato y horario
                </div>
                <div className="mt-3">
                  <ContratoForm
                    usuarioId={selectedUser.id}
                    horasActuales={selectedUser.contratos[0]?.horasSemanales ?? null}
                    fechaInicioActual={
                      selectedUser.contratos[0]?.fechaInicio
                        ? selectedUser.contratos[0].fechaInicio.toISOString().slice(0, 10)
                        : null
                    }
                  />
                </div>
              </section>

              {isAdmin && (
                <section className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                    <ShieldCheck size={16} />
                    Seguridad y acceso
                  </div>
                  <div className="mt-3 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                        <Mail size={12} />
                        Correo electronico
                      </div>
                      <EmailUpdateForm
                        usuarioId={selectedUser.id}
                        email={selectedUser.email}
                      />
                    </div>
                    <PasswordResetForm usuarioId={selectedUser.id} />
                    <NfcAssignForm
                      usuarioId={selectedUser.id}
                      tieneTarjeta={Boolean(selectedUser.nfcUidHash)}
                    />
                    <UserStatusForm
                      usuarioId={selectedUser.id}
                      usuarioNombre={selectedUser.nombre}
                      usuarioEmail={selectedUser.email}
                      activo={selectedUser.activo}
                      disabled={selectedUser.id === currentUserId}
                    />
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
