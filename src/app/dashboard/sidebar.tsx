"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Fingerprint,
  CalendarDays,
  CheckCircle2,
  Pencil,
  ClipboardList,
  Users,
  Building,
  Building2,
  MapPin,
  CreditCard,
  Settings,
  Menu,
  X,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const adminItems: NavItem[] = [
  { label: "Empleados", icon: Users, href: "/dashboard/empleados" },
  { label: "Departamentos", icon: Building2, href: "/dashboard/departamentos" },
  { label: "Centros de trabajo", icon: MapPin, href: "/dashboard/centros-trabajo" },
  { label: "Empresas", icon: Building, href: "/dashboard/empresas", adminOnly: true },
];

const normalizePath = (value: string) =>
  value === "/" ? "/" : value.replace(/\/$/, "");

const isActiveLink = (pathname: string, href: string) => {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/dashboard") {
    return current === "/dashboard";
  }

  return current === target || current.startsWith(`${target}/`);
};

type SidebarProps = {
  role?: string;
  userName?: string;
  mobileOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

export default function Sidebar({
  role,
  userName,
  mobileOpen = false,
  onOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isEmpleado = role === "EMPLEADO";
  const isAdmin = role === "ADMIN_SISTEMA";
  const isGerente = role === "GERENTE";

  const roleLabel = isAdmin
    ? "Administrador del sistema"
    : isGerente
      ? "Gerente"
      : "Empleado";

  const navigationPrimary: NavItem[] = isAdmin
    ? [
        { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard/escritorio" },
        { label: "Empresas", icon: Building, href: "/dashboard/empresas", adminOnly: true },
        { label: "Empleados", icon: Users, href: "/dashboard/empleados" },
        { label: "Departamentos", icon: Building2, href: "/dashboard/departamentos" },
        { label: "Centros", icon: MapPin, href: "/dashboard/centros-trabajo" },
      ]
    : [
        { label: "Escritorio", icon: LayoutDashboard, href: "/dashboard/escritorio" },
        { label: "Fichaje", icon: Fingerprint, href: "/dashboard" },
        { label: "Calendario", icon: CalendarDays, href: "/dashboard/calendario" },
      ];

  const navigationValidation: NavItem[] = !isEmpleado
    ? [
        { label: "Fichajes", icon: ClipboardList, href: "/dashboard/fichajes" },
        { label: "Modificacion de fichajes", icon: Pencil, href: "/dashboard/modificacion-fichajes" },
        { label: "Vacaciones/Ausencias", icon: CheckCircle2, href: "/dashboard/vacaciones-ausencias" },
      ]
    : [];

  const navigationControl: NavItem[] = !isEmpleado
    ? [{ label: "Kiosko NFC", icon: CreditCard, href: "/dashboard/kiosko" }]
    : [];

  const navigationSystem: NavItem[] = isAdmin
    ? [{ label: "Configuracion", icon: Settings, href: "/dashboard/ajustes" }]
    : !isEmpleado
      ? [{ label: "Ajustes", icon: Settings, href: "/dashboard/ajustes" }]
      : [];

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActiveLink(pathname, item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-sky-50 text-sky-700 shadow-sm"
            : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]"
        }`}
      >
        <Icon
          size={18}
          className={
            active
              ? "text-sky-500"
              : "text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]"
          }
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const renderMobileLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActiveLink(pathname, item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onClose}
        className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
          active ? "text-sky-600" : "text-[color:var(--text-muted)]"
        }`}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const renderDrawerLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActiveLink(pathname, item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onClose}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-sky-50 text-sky-700 shadow-sm"
            : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]"
        }`}
      >
        <Icon
          size={18}
          className={
            active
              ? "text-sky-500"
              : "text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]"
          }
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="force-mobile-hidden hidden w-full border-r border-[color:var(--card-border)] bg-[color:var(--card)] text-[color:var(--text-secondary)] md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:flex md:flex-col md:overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--card-border)] bg-white shadow-sm">
              <Image
                src="/brand/suma3-logo.jpeg"
                alt="suma3 consultores"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                mdmm
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">
                Panel de gestion
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-2">
            <p className="text-xs font-semibold text-[color:var(--text-secondary)]">
              Suma3 Consultores
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Plan enterprise
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="space-y-2">{navigationPrimary.map(renderLink)}</div>

          {navigationValidation.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                Validacion
              </p>
              <div className="space-y-2">{navigationValidation.map(renderLink)}</div>
            </div>
          )}

          {navigationControl.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                Control horario
              </p>
              <div className="space-y-2">{navigationControl.map(renderLink)}</div>
            </div>
          )}

          {!isEmpleado && !isAdmin && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                Administracion
              </p>
              <div className="space-y-2">
                {adminItems
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map(renderLink)}
              </div>
            </div>
          )}

          {!isEmpleado && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                Sistema
              </p>
              <div className="space-y-2">{navigationSystem.map(renderLink)}</div>
            </div>
          )}
        </nav>

        <div className="border-t border-[color:var(--card-border)] px-6 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-[color:var(--surface)] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
              {(userName ?? "U").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {userName ?? "Usuario"}
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`force-mobile-block fixed inset-0 z-40 bg-black/40 transition md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      >
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[color:var(--card-border)] bg-[color:var(--card)] text-[color:var(--text-secondary)] shadow-2xl transition ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[color:var(--card-border)] px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--card-border)] bg-white shadow-sm">
                <Image
                  src="/brand/suma3-logo.jpeg"
                  alt="suma3 consultores"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                  mdmm
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Panel de gestion
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--card-border)] p-2 text-[color:var(--text-muted)]"
              aria-label="Cerrar menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav
            className="flex-1 space-y-6 overflow-y-auto px-6 py-6 pb-24 overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="space-y-2">{navigationPrimary.map(renderDrawerLink)}</div>

            {navigationValidation.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  Validacion
                </p>
                <div className="space-y-2">
                  {navigationValidation.map(renderDrawerLink)}
                </div>
              </div>
            )}

            {navigationControl.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  Control horario
                </p>
                <div className="space-y-2">
                  {navigationControl.map(renderDrawerLink)}
                </div>
              </div>
            )}

            {!isEmpleado && !isAdmin && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  Administracion
                </p>
                <div className="space-y-2">
                  {adminItems
                    .filter((item) => !item.adminOnly || isAdmin)
                    .map(renderDrawerLink)}
                </div>
              </div>
            )}

            {!isEmpleado && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  Sistema
                </p>
                <div className="space-y-2">
                  {navigationSystem.map(renderDrawerLink)}
                </div>
              </div>
            )}
          </nav>
        </aside>
      </div>

      <nav className="force-mobile-block fixed bottom-0 left-0 right-0 z-30 border-t border-[color:var(--card-border)] bg-[color:var(--card)] px-4 py-2 text-[color:var(--text-secondary)] backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          {navigationPrimary.map(renderMobileLink)}
          {!isEmpleado && (
            <button
              type="button"
              onClick={onOpen}
              className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
              aria-label="Menu"
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

