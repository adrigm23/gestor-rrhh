import type { ReactNode } from "react";
import { auth } from "../api/auth/auth";
import Sidebar from "./sidebar";
import HeaderActions from "./header-actions";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  const userName = session?.user?.name ?? "Usuario";
  const role = session?.user?.role;

  return (
    <div className="min-h-screen bg-[#eef1ff] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar role={role} />

        <div className="flex min-h-screen flex-1 flex-col">
          <header>
            <HeaderActions userName={userName} />
          </header>

          <main className="flex-1 px-10 pb-10">{children}</main>

          <footer className="pb-8 text-center text-xs text-slate-400">
            <p>© 2026 - SD OnTime · Politica de Privacidad · Aviso Legal</p>
            <p className="mt-1 text-slate-300">v1.7.7</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
