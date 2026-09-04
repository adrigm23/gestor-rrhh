"use client";

import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import ThemeToggle from "../components/theme-toggle";
import NotificationBell from "./notification-bell";
import type { DashboardNotificationSummary } from "./notification-types";

type HeaderActionsProps = {
  userName: string;
  notificationSummary: DashboardNotificationSummary;
  onMenuClick?: () => void;
};

export default function HeaderActions({
  userName,
  notificationSummary,
  onMenuClick,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm text-[color:var(--text-secondary)] sm:px-6 md:justify-end md:px-10 md:py-6">
      <span className="truncate font-medium text-[color:var(--text-primary)]">
        {userName}
      </span>
      <NotificationBell
        summary={notificationSummary}
        panelId="notificaciones-panel"
        buttonClassName="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
      />
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

