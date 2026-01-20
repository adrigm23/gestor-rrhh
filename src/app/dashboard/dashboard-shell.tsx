"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "./sidebar";
import HeaderActions from "./header-actions";

type DashboardShellProps = {
  children: ReactNode;
  userName: string;
  role?: string;
};

export default function DashboardShell({
  children,
  userName,
  role,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#eef1ff] text-slate-900">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          role={role}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpen={() => setMobileMenuOpen(true)}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/30 bg-[#eef1ff]/80 backdrop-blur md:static md:border-b-0 md:bg-transparent md:backdrop-blur-none">
            <HeaderActions
              userName={userName}
              onMenuClick={() => setMobileMenuOpen(true)}
            />
          </header>

          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:px-10 md:pb-10">
            {children}
          </main>

          <footer className="pb-24 text-center text-xs text-slate-400 md:pb-8">
            <p>(c) 2026 - SD OnTime - Politica de Privacidad - Aviso Legal</p>
            <p className="mt-1 text-slate-300">v1.7.7</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
