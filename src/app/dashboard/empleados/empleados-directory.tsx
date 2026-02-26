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

const roleBadge = (rol: string, usePrototypeDark: boolean) => {
  if (usePrototypeDark) {
    if (rol === "GERENTE") {
      return "border border-violet-500/45 bg-violet-500/18 text-violet-200";
    }
    if (rol === "ADMIN_SISTEMA") {
      return "border border-sky-500/45 bg-sky-500/18 text-sky-200";
    }
    return "border border-slate-400/35 bg-slate-400/10 text-slate-200";
  }

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

const avatarClass = (name: string, usePrototypeDark: boolean) => {
  if (usePrototypeDark) return `border ${avatarTone(name)}`;
  return "bg-slate-100 text-slate-600";
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
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const selectedUser = useMemo(
    () => usuarios.find((item) => item.id === selectedId) ?? null,
    [usuarios, selectedId],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveTheme = () => {
      const forced = root.dataset.theme;
      if (forced === "dark") return true;
      if (forced === "light") return false;
      return media.matches;
    };

    const applyTheme = () => setIsDarkTheme(resolveTheme());
    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", applyTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", applyTheme);
    };
  }, []);

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
  const usePrototypeDark = isAdmin && isDarkTheme;
  const totalPages = Math.max(1, Math.ceil(totalUsuarios / pageSize));
  const firstItem = totalUsuarios === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalUsuarios);
  const desktopGridClass = usePrototypeDark
    ? "grid-cols-[2.2fr_1.55fr_0.8fr_1.05fr_auto]"
    : "grid-cols-[2.2fr_1.4fr_0.6fr_1.4fr_auto]";

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
    <div className={usePrototypeDark ? "relative space-y-7" : "space-y-8"}>
      {usePrototypeDark && (
        <div
          className="pointer-events-none absolute -top-16 left-0 h-56 w-56 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(39,177,202,0.16) 0%, rgba(7,17,34,0) 72%)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={
          usePrototypeDark
            ? "relative flex flex-wrap items-start justify-between gap-4"
            : "flex flex-wrap items-center justify-between gap-4"
        }
      >
        <div className="space-y-2">
          <p
            className={
              usePrototypeDark ? "text-sm text-[#8ca3c7]" : "text-xs text-[color:var(--text-muted)]"
            }
          >
            {usePrototypeDark ? (
              <>
                <span className="text-[#7f91af]">Inicio</span> /{" "}
                <span className="font-medium text-[#d5e2fb]">Empleados</span>
              </>
            ) : (
              "Inicio / Empleados"
            )}
          </p>
          <h2
            className={
              usePrototypeDark
                ? "text-4xl font-semibold tracking-tight text-[#f7fbff]"
                : "text-3xl font-semibold text-[color:var(--text-primary)]"
            }
          >
            Directorio de Empleados
          </h2>
          <p
            className={
              usePrototypeDark ? "text-lg text-[#9cb2d4]" : "text-sm text-[color:var(--text-muted)]"
            }
          >
            Gestiona los usuarios y accesos de todas las empresas cliente.
          </p>
        </div>
        {isAdmin && (
          <CreateUserPanel empresas={empresas} departamentos={departamentos} />
        )}
      </div>

      <form
        method="get"
        className={
          usePrototypeDark
            ? "relative z-[1] rounded-2xl border border-[#2b3f67] bg-[#111d37]/95 p-3 shadow-[0_20px_55px_rgba(4,9,25,0.35)]"
            : "flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] px-4 py-4 shadow-[var(--shadow-soft)]"
        }
      >
        <div
          className={
            usePrototypeDark
              ? "flex flex-col gap-3 lg:flex-row lg:items-center"
              : "contents"
          }
        >
          <div
            className={
              usePrototypeDark
                ? "flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-[#2a3b5d] bg-[#0d1830] px-4 py-3 text-sm text-[#6f85aa]"
                : "flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-muted)]"
            }
          >
            <Search size={usePrototypeDark ? 18 : 16} />
            <input
              type="text"
              name="q"
              defaultValue={query}
              className={
                usePrototypeDark
                  ? "w-full min-w-0 bg-transparent text-[15px] text-[#d7e6ff] placeholder:text-[#6f85aa] outline-none"
                  : "w-full bg-transparent outline-none"
              }
              placeholder="Buscar por nombre, email o NFC..."
            />
          </div>

          <div className={usePrototypeDark ? "flex flex-wrap items-center gap-2 lg:pl-2" : "contents"}>
            {isAdmin && (
              <select
                name="empresaId"
                defaultValue={empresaParam}
                className={
                  usePrototypeDark
                    ? "rounded-xl border border-[#2a3b5d] bg-[#23324d] px-4 py-2.5 text-base text-[#dbe7fb]"
                    : "rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
                }
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
                className={
                  usePrototypeDark
                    ? "rounded-xl border border-[#2a3b5d] bg-[#23324d] px-4 py-2.5 text-base text-[#dbe7fb]"
                    : "rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
                }
              >
                <option value="todos">Todos los roles</option>
                <option value="EMPLEADO">Empleados</option>
                <option value="GERENTE">Gerentes</option>
              </select>
            )}

            <select
              name="estado"
              defaultValue={estadoParam}
              className={
                usePrototypeDark
                  ? "rounded-xl border border-[#2a3b5d] bg-[#23324d] px-4 py-2.5 text-base text-[#dbe7fb]"
                  : "rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
              }
            >
              <option value="activos">Activos</option>
              <option value="baja">Baja</option>
              <option value="todos">Todos</option>
            </select>

            <button
              type="submit"
              className={
                usePrototypeDark
                  ? "rounded-xl bg-white px-6 py-2.5 text-base font-medium text-slate-900 transition hover:bg-slate-100"
                  : "rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              }
            >
              Buscar
            </button>
          </div>
        </div>
      </form>

      <section
        className={
          usePrototypeDark
            ? "rounded-2xl border border-[#253a61] bg-[#111b33]/95 shadow-[0_25px_70px_rgba(4,9,24,0.35)]"
            : "rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] shadow-[var(--shadow-card)]"
        }
      >
        <div
          className={
            usePrototypeDark
              ? "flex items-center justify-between border-b border-[#263b61] px-6 py-4 text-sm text-[#9fb2d4]"
              : "flex items-center justify-between border-b border-[color:var(--card-border)] px-6 py-4 text-sm text-[color:var(--text-muted)]"
          }
        >
          <span>Usuarios registrados</span>
          {usePrototypeDark ? (
            <span>
              {totalUsuarios} <span className="text-[#7b91b6]">Total</span>
            </span>
          ) : (
            <span>{totalUsuarios}</span>
          )}
        </div>
        {usuarios.length === 0 ? (
          <div
            className={
              usePrototypeDark
                ? "px-6 py-8 text-sm text-[#9fb2d4]"
                : "px-6 py-8 text-sm text-[color:var(--text-muted)]"
            }
          >
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
                    className={
                      usePrototypeDark
                        ? "rounded-2xl border border-[#2b3f67] bg-[#0f1a31] p-4"
                        : "rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarClass(
                            usuario.nombre,
                            usePrototypeDark,
                          )}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                usePrototypeDark
                                  ? "text-sm font-semibold text-[#f0f6ff]"
                                  : "text-sm font-semibold text-[color:var(--text-primary)]"
                              }
                            >
                              {usuario.nombre}
                            </span>
                            <span
                              className={`${
                                usePrototypeDark
                                  ? "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
                                  : "rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              } ${roleBadge(usuario.rol, usePrototypeDark)}`}
                            >
                              {roleLabel(usuario.rol)}
                            </span>
                            {!usuario.activo && (
                              <span
                                className={
                                  usePrototypeDark
                                    ? "rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                                    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                                }
                              >
                                Baja
                              </span>
                            )}
                          </div>
                          <div
                            className={
                              usePrototypeDark
                                ? "text-xs text-[#8ca1c3]"
                                : "text-xs text-[color:var(--text-muted)]"
                            }
                          >
                            {usuario.email}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(usuario.id)}
                        className={
                          usePrototypeDark
                            ? "rounded-full border border-[#30456f] bg-[#121f38] p-2 text-[#9cb1d4] transition hover:text-[#f0f6ff]"
                            : "rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                        }
                        aria-label="Editar usuario"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    <div
                      className={
                        usePrototypeDark
                          ? "mt-3 text-xs text-[#8ca1c3]"
                          : "mt-3 text-xs text-[color:var(--text-muted)]"
                      }
                    >
                      {empresa} - {departamento}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={
                          usePrototypeDark
                            ? "rounded-full border border-[#30456f] px-3 py-1 text-[#c7d7f4]"
                            : "rounded-full border border-[color:var(--card-border)] px-3 py-1 text-[color:var(--text-secondary)]"
                        }
                      >
                        {horasContrato ? `${horasContrato}h/sem` : "Sin contrato"}
                      </span>
                      <span
                        className={
                          usePrototypeDark
                            ? "rounded-full border border-[#30456f] px-3 py-1 text-[#c7d7f4]"
                            : "rounded-full border border-[color:var(--card-border)] px-3 py-1 text-[color:var(--text-secondary)]"
                        }
                      >
                        NFC: {usuario.nfcUidHash ? "Asignado" : "No asignado"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          usuario.passwordMustChange
                            ? usePrototypeDark
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-amber-100 text-amber-700"
                            : usePrototypeDark
                              ? "bg-emerald-500/20 text-emerald-200"
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
              <div
                className={
                  usePrototypeDark
                    ? "px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#95a9ca]"
                    : "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]"
                }
              >
                <div
                  className={`grid ${desktopGridClass} ${
                    usePrototypeDark ? "gap-5" : "gap-4"
                  }`}
                >
                  <span>Usuario &amp; rol</span>
                  <span>Organizacion</span>
                  <span>Contrato</span>
                  <span>Seguridad</span>
                  <span className="text-right">Acciones</span>
                </div>
              </div>
              <div className={usePrototypeDark ? "divide-y divide-[#263b61]" : "divide-y divide-[color:var(--card-border)]"}>
                {usuarios.map((usuario) => {
                  const initials = initialsFromName(usuario.nombre || "U");
                  const horasContrato = usuario.contratos[0]?.horasSemanales ?? null;
                  const departamento = usuario.departamento?.nombre ?? "Sin departamento";
                  const empresa = usuario.empresa?.nombre ?? "Sin empresa";
                  const passwordLabel = usuario.passwordMustChange
                    ? "Reset requerido"
                    : "Password activo";
                  const passwordClass = usuario.passwordMustChange
                    ? usePrototypeDark
                      ? "text-amber-300"
                      : "text-amber-600"
                    : usePrototypeDark
                      ? "text-emerald-300"
                      : "text-emerald-600";

                  return (
                    <div
                      key={usuario.id}
                      className={`grid ${desktopGridClass} ${
                        usePrototypeDark
                          ? "gap-5 px-6 py-4 text-sm text-[#c4d4ef]"
                          : "gap-4 px-6 py-4 text-sm text-[color:var(--text-secondary)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarClass(
                            usuario.nombre,
                            usePrototypeDark,
                          )}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                usePrototypeDark
                                  ? "font-semibold text-[#f3f8ff]"
                                  : "font-semibold text-[color:var(--text-primary)]"
                              }
                            >
                              {usuario.nombre}
                            </span>
                            <span
                              className={`${
                                usePrototypeDark
                                  ? "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
                                  : "rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              } ${roleBadge(usuario.rol, usePrototypeDark)}`}
                            >
                              {roleLabel(usuario.rol)}
                            </span>
                            {!usuario.activo && (
                              <span
                                className={
                                  usePrototypeDark
                                    ? "rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                                    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                                }
                              >
                                Baja
                              </span>
                            )}
                          </div>
                          <div
                            className={
                              usePrototypeDark
                                ? "text-xs text-[#8ca1c3]"
                                : "text-xs text-[color:var(--text-muted)]"
                            }
                          >
                            {usuario.email}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div
                          className={
                            usePrototypeDark
                              ? "inline-flex rounded-lg border border-[#30456f] bg-[#22324f] px-3 py-1 text-xs font-medium text-[#d7e4fb]"
                              : "inline-flex rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text-secondary)]"
                          }
                        >
                          {empresa}
                        </div>
                        <div
                          className={
                            usePrototypeDark
                              ? "text-xs text-[#8ca1c3]"
                              : "text-xs text-[color:var(--text-muted)]"
                          }
                        >
                          {departamento}
                        </div>
                      </div>

                      <div
                        className={
                          usePrototypeDark
                            ? "text-sm font-semibold text-[#f2f7ff]"
                            : "text-sm font-semibold text-[color:var(--text-primary)]"
                        }
                      >
                        {horasContrato ? `${horasContrato}h` : "Sin contrato"}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              usePrototypeDark
                                ? "font-semibold text-[#d4e1f7]"
                                : "font-semibold text-[color:var(--text-secondary)]"
                            }
                          >
                            NFC
                          </span>
                          <span
                            className={
                              usePrototypeDark
                                ? "text-[#8ca1c3]"
                                : "text-[color:var(--text-muted)]"
                            }
                          >
                            {usuario.nfcUidHash ? "Asignado" : "No asignado"}
                          </span>
                        </div>
                        <div className={passwordClass}>{passwordLabel}</div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedId(usuario.id)}
                          className={
                            usePrototypeDark
                              ? "rounded-full border border-[#30456f] bg-[#121f38] p-2 text-[#9cb1d4] transition hover:text-[#f0f6ff]"
                              : "rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                          }
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

      {usePrototypeDark && (
        <p className="px-2 text-lg text-[#95a8c9]">
          Mostrando {firstItem}-{lastItem} de {totalUsuarios} empleados
        </p>
      )}

      {totalPages > 1 && (
        <div
          className={
            usePrototypeDark
              ? "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2b3f67] bg-[#111d37]/95 px-4 py-3 text-sm text-[#95a8c9]"
              : "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--text-muted)]"
          }
        >
          <span>
            Pagina {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={buildPageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                page <= 1
                  ? usePrototypeDark
                    ? "pointer-events-none border border-[#30456f] bg-[#1a2844] text-[#6f85aa]"
                    : "pointer-events-none border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]"
                  : usePrototypeDark
                    ? "border border-[#30456f] bg-[#1a2844] text-[#c6d5f2] hover:text-[#f0f6ff]"
                    : "border border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              Anterior
            </a>
            <a
              href={buildPageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                page >= totalPages
                  ? usePrototypeDark
                    ? "pointer-events-none border border-[#30456f] bg-[#1a2844] text-[#6f85aa]"
                    : "pointer-events-none border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]"
                  : usePrototypeDark
                    ? "border border-[#30456f] bg-[#1a2844] text-[#c6d5f2] hover:text-[#f0f6ff]"
                    : "border border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
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
