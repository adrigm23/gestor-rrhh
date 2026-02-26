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
    <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm text-[color:var(--text-secondary)] sm:px-6 md:justify-end md:px-10 md:py-5">
      <span className="truncate font-medium text-[color:var(--text-primary)] md:hidden">
        {userName}
      </span>
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative rounded-full border border-[#2c405f] bg-[#0f1b34] p-2 text-[#a7bad9] transition hover:text-[#eaf2ff]"
          aria-label="Notificaciones"
          aria-expanded={open}
          aria-controls="notificaciones-panel"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />
        </button>
        {open && (
          <div
            id="notificaciones-panel"
            className="fixed left-1/2 top-16 z-30 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-4 text-xs text-[color:var(--text-secondary)] shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-72 sm:translate-x-0"
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
        className="force-mobile-inline-flex rounded-full border border-[#2c405f] bg-[#0f1b34] p-2 text-[#a7bad9] transition hover:text-[#eaf2ff] md:hidden"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 border-l border-[#2c405f] pl-4 text-sm font-semibold uppercase tracking-[0.06em] text-[#d9e7ff] transition hover:text-white sm:pl-6"
      >
        <LogOut size={16} />
        <span>Cerrar sesion</span>
      </button>
    </div>
  );
}

