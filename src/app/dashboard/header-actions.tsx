"use client";

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
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm text-slate-700 sm:px-6 md:justify-end md:px-10 md:py-6">
      <span className="truncate font-medium">{userName}</span>
      <button
        type="button"
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
      </button>
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700 md:hidden"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 sm:px-4"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Cerrar sesion</span>
      </button>
    </div>
  );
}
