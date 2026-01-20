"use client";

import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu } from "lucide-react";

type HeaderActionsProps = {
  userName: string;
};

export default function HeaderActions({ userName }: HeaderActionsProps) {
  return (
    <div className="flex items-center justify-end gap-4 px-10 py-6 text-sm text-slate-700">
      <span className="font-medium">{userName}</span>
      <button
        type="button"
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
      </button>
      <button
        type="button"
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
      >
        <LogOut size={16} />
        Cerrar sesion
      </button>
    </div>
  );
}
