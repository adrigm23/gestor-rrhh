"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Fingerprint,
  CalendarDays,
  MessageCircle,
  CheckCircle2,
  Pencil,
  ClipboardList,
  Users,
  Building2,
  MapPin,
  Settings,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const primaryItems: NavItem[] = [
  { label: "Escritorio", icon: LayoutDashboard, href: "/dashboard/escritorio" },
  { label: "Fichaje", icon: Fingerprint, href: "/dashboard" },
  { label: "Calendario", icon: CalendarDays, href: "/dashboard/calendario" },
  { label: "Comunicaciones", icon: MessageCircle, href: "/dashboard/comunicaciones" },
];

const validationItems: NavItem[] = [
  { label: "Vacaciones/Ausencias", icon: CheckCircle2, href: "/dashboard/vacaciones-ausencias" },
  { label: "Modificacion de fichajes", icon: Pencil, href: "/dashboard/modificacion-fichajes" },
  { label: "Fichajes", icon: ClipboardList, href: "/dashboard/fichajes" },
];

const adminItems: NavItem[] = [
  { label: "Empleados", icon: Users, href: "/dashboard/empleados" },
  { label: "Departamentos", icon: Building2, href: "/dashboard/departamentos" },
  { label: "Centros de trabajo", icon: MapPin, href: "/dashboard/centros-trabajo" },
];

const systemItems: NavItem[] = [
  { label: "Ajustes", icon: Settings, href: "/dashboard/ajustes" },
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
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isEmpleado = role === "EMPLEADO";

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActiveLink(pathname, item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white shadow-inner"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        <Icon size={18} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-full bg-[#1f1b4d] text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] md:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
          <span className="text-2xl font-black text-[#5b21b6]">SD</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Menu
          </p>
          <p className="text-sm font-semibold">SD OnTime</p>
        </div>
      </div>

      <nav className="space-y-6 px-6 py-6">
        <div className="space-y-2">{primaryItems.map(renderLink)}</div>

        {!isEmpleado && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
              Validacion
            </p>
            <div className="space-y-2">{validationItems.map(renderLink)}</div>
          </div>
        )}

        {!isEmpleado && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
              Administracion
            </p>
            <div className="space-y-2">{adminItems.map(renderLink)}</div>
          </div>
        )}

        {!isEmpleado && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
              Sistema
            </p>
            <div className="space-y-2">{systemItems.map(renderLink)}</div>
          </div>
        )}
      </nav>
    </aside>
  );
}
