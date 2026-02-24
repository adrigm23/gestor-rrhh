"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Settings } from "lucide-react";

export default function DashboardQuickActions() {
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
    <div className="flex items-center gap-2">
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] shadow-sm transition hover:text-[color:var(--text-primary)]"
          aria-label="Notificaciones"
          aria-expanded={open}
          aria-controls="dashboard-notificaciones"
        >
          <Bell size={18} />
        </button>
        {open && (
          <div
            id="dashboard-notificaciones"
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
      <a
        href="/dashboard/ajustes"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] shadow-sm transition hover:text-[color:var(--text-primary)]"
        aria-label="Ajustes"
      >
        <Settings size={18} />
      </a>
    </div>
  );
}
