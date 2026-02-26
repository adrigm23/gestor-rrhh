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
import UserDeleteForm from "./user-delete-form";

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
  totalUsuarios: number;
  page: number;
  pageSize: number;
  empresas: EmpresaOption[];
  departamentos: DepartamentoOption[];
};

const roleBadge = (rol: string) => {
  if (rol === "GERENTE") {
    return "border border-violet-500/45 bg-violet-500/18 text-violet-200";
  }
  if (rol === "ADMIN_SISTEMA") {
    return "border border-sky-500/45 bg-sky-500/18 text-sky-200";
  }
  return "border border-slate-400/35 bg-slate-400/10 text-slate-200";
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

const avatarTone = (name: string) => {
  const tones = [
    "border-sky-400/35 bg-sky-500/12 text-sky-200",
    "border-cyan-400/35 bg-cyan-500/12 text-cyan-200",
    "border-indigo-400/35 bg-indigo-500/12 text-indigo-200",
    "border-emerald-400/35 bg-emerald-500/12 text-emerald-200",
    "border-violet-400/35 bg-violet-500/12 text-violet-200",
  ];

  const seed = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tones[seed % tones.length];
};

export default function EmpleadosDirectory({
  role,
  currentUserId,
  query,
  estadoParam,
  rolParam,
  empresaParam,
  usuarios,
  totalUsuarios,
  page,
  pageSize,
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
  const totalPages = Math.max(1, Math.ceil(totalUsuarios / pageSize));
  const firstItem = totalUsuarios === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalUsuarios);

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (empresaParam) params.set("empresaId", empresaParam);
    if (rolParam && rolParam !== "todos") params.set("rol", rolParam);
    if (estadoParam && estadoParam !== "activos") params.set("estado", estadoParam);
    if (targetPage > 1) params.set("page", String(targetPage));
    const suffix = params.toString();
    return suffix ? `/dashboard/empleados?${suffix}` : "/dashboard/empleados";
  };

  return (
    <div className="relative space-y-7">
      <div
        className="pointer-events-none absolute -top-16 left-0 h-56 w-56 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(39,177,202,0.16) 0%, rgba(7,17,34,0) 72%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-[#8ca3c7]">
            <span className="text-[#7f91af]">Inicio</span> /{" "}
            <span className="font-medium text-[#d5e2fb]">Empleados</span>
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-[#f7fbff]">
            Directorio de Empleados
          </h2>
          <p className="text-lg text-[#9cb2d4]">
            Gestiona los usuarios y accesos de todas las empresas cliente.
          </p>
        </div>
        {isAdmin && (
          <CreateUserPanel empresas={empresas} departamentos={departamentos} />
        )}
      </div>

      <form
        method="get"
        className="relative z-[1] rounded-2xl border border-[#2b3f67] bg-[#111d37]/95 p-3 shadow-[0_20px_55px_rgba(4,9,25,0.35)]"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-[#2a3b5d] bg-[#0d1830] px-4 py-3 text-sm text-[#6f85aa]">
            <Search size={18} />
            <input
              type="text"
              name="q"
              defaultValue={query}
              className="w-full min-w-0 bg-transparent text-[15px] text-[#d7e6ff] placeholder:text-[#6f85aa] outline-none"
              placeholder="Buscar por nombre, email o NFC..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:pl-2">
            {isAdmin && (
              <select
                name="empresaId"
                defaultValue={empresaParam}
                className="rounded-xl border border-[#2a3b5d] bg-[#23324d] px-4 py-2.5 text-base text-[#dbe7fb]"
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
                className="rounded-xl border border-[#2a3b5d] bg-[#23324d] px-4 py-2.5 text-base text-[#dbe7fb]"
              >
                <option value="todos">Todos los roles</option>
                <option value="EMPLEADO">Empleados</option>
                <option value="GERENTE">Gerentes</option>
              </select>
            )}

            <select
              name="estado"
              defaultValue={estadoParam}
              className="rounded-xl border border-[#2a3b5d] bg-[#23324d] px-4 py-2.5 text-base text-[#dbe7fb]"
            >
              <option value="activos">Activos</option>
              <option value="baja">Baja</option>
              <option value="todos">Todos</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-white px-6 py-2.5 text-base font-medium text-slate-900 transition hover:bg-slate-100"
            >
              Buscar
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-2xl border border-[#253a61] bg-[#111b33]/95 shadow-[0_25px_70px_rgba(4,9,24,0.35)]">
        <div className="flex items-center justify-between border-b border-[#263b61] px-6 py-4 text-sm text-[#9fb2d4]">
          <span>Usuarios registrados</span>
          <span>
            {totalUsuarios} <span className="text-[#7b91b6]">Total</span>
          </span>
        </div>
        {usuarios.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#9fb2d4]">
            No hay usuarios registrados con los filtros actuales.
          </div>
        ) : (
          <>
            <div className="space-y-3 px-4 py-4 md:hidden">
              {usuarios.map((usuario) => {
                const initials = initialsFromName(usuario.nombre || "U");
                const horasContrato = usuario.contratos[0]?.horasSemanales ?? null;
                const departamento = usuario.departamento?.nombre ?? "Sin departamento";
                const empresa = usuario.empresa?.nombre ?? "Sin empresa";
                return (
                  <div
                    key={usuario.id}
                    className="rounded-2xl border border-[#2b3f67] bg-[#0f1a31] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${avatarTone(
                            usuario.nombre,
                          )}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#f0f6ff]">
                              {usuario.nombre}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${roleBadge(
                                usuario.rol,
                              )}`}
                            >
                              {roleLabel(usuario.rol)}
                            </span>
                            {!usuario.activo && (
                              <span className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                                Baja
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#8ca1c3]">{usuario.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(usuario.id)}
                        className="rounded-full border border-[#30456f] bg-[#121f38] p-2 text-[#9cb1d4] transition hover:text-[#f0f6ff]"
                        aria-label="Editar usuario"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-[#8ca1c3]">
                      {empresa} - {departamento}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-[#30456f] px-3 py-1 text-[#c7d7f4]">
                        {horasContrato ? `${horasContrato}h/sem` : "Sin contrato"}
                      </span>
                      <span className="rounded-full border border-[#30456f] px-3 py-1 text-[#c7d7f4]">
                        NFC: {usuario.nfcUidHash ? "Asignado" : "No asignado"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          usuario.passwordMustChange
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-emerald-500/20 text-emerald-200"
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
              <div className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#95a9ca]">
                <div className="grid grid-cols-[2.2fr_1.55fr_0.8fr_1.05fr_auto] gap-5">
                  <span>Usuario &amp; rol</span>
                  <span>Organizacion</span>
                  <span>Contrato</span>
                  <span>Seguridad</span>
                  <span className="text-right">Acciones</span>
                </div>
              </div>
              <div className="divide-y divide-[#263b61]">
                {usuarios.map((usuario) => {
                  const initials = initialsFromName(usuario.nombre || "U");
                  const horasContrato = usuario.contratos[0]?.horasSemanales ?? null;
                  const departamento = usuario.departamento?.nombre ?? "Sin departamento";
                  const empresa = usuario.empresa?.nombre ?? "Sin empresa";
                  const passwordLabel = usuario.passwordMustChange
                    ? "Reset requerido"
                    : "Password activo";
                  const passwordClass = usuario.passwordMustChange
                    ? "text-amber-300"
                    : "text-emerald-300";

                  return (
                    <div
                      key={usuario.id}
                      className="grid grid-cols-[2.2fr_1.55fr_0.8fr_1.05fr_auto] gap-5 px-6 py-4 text-sm text-[#c4d4ef]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${avatarTone(
                            usuario.nombre,
                          )}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#f3f8ff]">
                              {usuario.nombre}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ${roleBadge(
                                usuario.rol,
                              )}`}
                            >
                              {roleLabel(usuario.rol)}
                            </span>
                            {!usuario.activo && (
                              <span className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                                Baja
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#8ca1c3]">{usuario.email}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="inline-flex rounded-lg border border-[#30456f] bg-[#22324f] px-3 py-1 text-xs font-medium text-[#d7e4fb]">
                          {empresa}
                        </div>
                        <div className="text-xs text-[#8ca1c3]">{departamento}</div>
                      </div>

                      <div className="text-sm font-semibold text-[#f2f7ff]">
                        {horasContrato ? `${horasContrato}h` : "Sin contrato"}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#d4e1f7]">NFC</span>
                          <span className="text-[#8ca1c3]">
                            {usuario.nfcUidHash ? "Asignado" : "No asignado"}
                          </span>
                        </div>
                        <div className={passwordClass}>{passwordLabel}</div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedId(usuario.id)}
                          className="rounded-full border border-[#30456f] bg-[#121f38] p-2 text-[#9cb1d4] transition hover:text-[#f0f6ff]"
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

      <p className="px-2 text-lg text-[#95a8c9]">
        Mostrando {firstItem}-{lastItem} de {totalUsuarios} empleados
      </p>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2b3f67] bg-[#111d37]/95 px-4 py-3 text-sm text-[#95a8c9]">
          <span>
            Pagina {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={buildPageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                page <= 1
                  ? "pointer-events-none border-[#30456f] bg-[#1a2844] text-[#6f85aa]"
                  : "border-[#30456f] bg-[#1a2844] text-[#c6d5f2] hover:text-[#f0f6ff]"
              }`}
            >
              Anterior
            </a>
            <a
              href={buildPageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                page >= totalPages
                  ? "pointer-events-none border-[#30456f] bg-[#1a2844] text-[#6f85aa]"
                  : "border-[#30456f] bg-[#1a2844] text-[#c6d5f2] hover:text-[#f0f6ff]"
              }`}
            >
              Siguiente
            </a>
          </div>
        </div>
      )}

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
                    <UserDeleteForm
                      usuarioId={selectedUser.id}
                      usuarioNombre={selectedUser.nombre}
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
