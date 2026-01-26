"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu } from "lucide-react";

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
    <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm text-slate-700 sm:px-6 md:justify-end md:px-10 md:py-6">
      <span className="truncate font-medium">{userName}</span>
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700"
          aria-label="Notificaciones"
          aria-expanded={open}
          aria-controls="notificaciones-panel"
        >
          <Bell size={18} />
        </button>
        {open && (
          <div
            id="notificaciones-panel"
            className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-xl"
            role="dialog"
            aria-label="Notificaciones"
          >
            <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
            <p className="mt-2 text-slate-500">No tienes notificaciones nuevas.</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onMenuClick}
        className="force-mobile-inline-flex rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700 md:hidden"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded-full bg-[#0b1535] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#14254f] sm:px-4"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Cerrar sesion</span>
      </button>
    </div>
  );
}

