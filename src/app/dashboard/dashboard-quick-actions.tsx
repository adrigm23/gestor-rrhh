"use client";

import { Settings } from "lucide-react";
import NotificationBell from "./notification-bell";
import type { DashboardNotificationSummary } from "./notification-types";

type DashboardQuickActionsProps = {
  notificationSummary: DashboardNotificationSummary;
};

export default function DashboardQuickActions({
  notificationSummary,
}: DashboardQuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <NotificationBell
        summary={notificationSummary}
        panelId="dashboard-notificaciones"
        buttonClassName="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] shadow-sm transition hover:text-[color:var(--text-primary)]"
      />
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
