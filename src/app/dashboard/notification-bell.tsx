"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatAppDateTime } from "../utils/datetime";
import type { DashboardNotificationSummary } from "./notification-types";

type NotificationBellProps = {
  summary: DashboardNotificationSummary;
  panelId: string;
  buttonClassName: string;
  panelClassName?: string;
};

export default function NotificationBell({
  summary,
  panelId,
  buttonClassName,
  panelClassName = "",
}: NotificationBellProps) {
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
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={buttonClassName}
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Bell size={18} />
        {summary.total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {summary.total > 9 ? "9+" : summary.total}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          className={`fixed left-1/2 top-16 z-30 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-4 text-xs text-[color:var(--text-secondary)] shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 sm:translate-x-0 ${panelClassName}`}
          role="dialog"
          aria-label="Notificaciones"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Notificaciones
            </p>
            <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold text-sky-700">
              {summary.total}
            </span>
          </div>

          {summary.items.length === 0 ? (
            <p className="mt-3 text-[color:var(--text-muted)]">
              No tienes notificaciones nuevas.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {summary.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-3 transition hover:border-sky-200 hover:bg-sky-50/60"
                >
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[color:var(--text-secondary)]">
                    {item.description}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    {formatAppDateTime(item.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
