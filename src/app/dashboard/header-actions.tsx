"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu } from "lucide-react";
import ThemeToggle from "../components/theme-toggle";

type HeaderActionsProps = {
  userName: string;
  onMenuClick?: () => void;
};

export default function HeaderActions({
  userName,
  onMenuClick,
}: HeaderActionsProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: PointerEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm text-[color:var(--text-secondary)] sm:px-6 md:justify-end md:px-10 md:py-6">
      <span className="truncate font-medium text-[color:var(--text-primary)]">
        {userName}
      </span>
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
          aria-label="Notificaciones"
          aria-expanded={open}
          aria-controls="notificaciones-panel"
        >
          <Bell size={18} />
        </button>
        {open && (
          <div
            id="notificaciones-panel"
            className="absolute right-0 top-12 w-72 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-4 text-xs text-[color:var(--text-secondary)] shadow-xl"
            role="dialog"
            aria-label="Notificaciones"
          >
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Notificaciones
            </p>
            <p className="mt-2 text-[color:var(--text-muted)]">
              No tienes notificaciones nuevas.
            </p>
          </div>
        )}
      </div>
      <ThemeToggle className="hidden sm:inline-flex" />
      <button
        type="button"
        onClick={onMenuClick}
        className="force-mobile-inline-flex rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)] md:hidden"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded-full bg-[color:var(--sidebar-bg)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 sm:px-4"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Cerrar sesion</span>
      </button>
    </div>
  );
}

