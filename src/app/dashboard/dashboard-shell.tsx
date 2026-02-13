"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const updateDeviceClass = () => {
      const ua = navigator.userAgent ?? "";
      const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
      const pointerCoarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      const screenMin = Math.min(window.screen.width, window.screen.height);
      const isMobile = uaMobile || pointerCoarse || screenMin <= 820;

      document.documentElement.classList.toggle("device-mobile", isMobile);
    };

    updateDeviceClass();
    window.addEventListener("resize", updateDeviceClass);
    window.addEventListener("orientationchange", updateDeviceClass);

    return () => {
      window.removeEventListener("resize", updateDeviceClass);
      window.removeEventListener("orientationchange", updateDeviceClass);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f0faf9,_#f4f6fb_45%,_#ecf1f9_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          role={role}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpen={() => setMobileMenuOpen(true)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur md:static md:border-b-0 md:bg-transparent md:backdrop-blur-none">
            <HeaderActions
              userName={userName}
              onMenuClick={() => setMobileMenuOpen(true)}
            />
          </header>

          <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 md:px-10 md:pb-10">
            {children}
          </main>

          <footer className="pb-24 text-center text-xs text-slate-400 md:pb-8">
            <p>(c) 2026 - mdmm - suma3 consultores - Politica de Privacidad - Aviso Legal</p>
            <p className="mt-1 text-slate-300">v1.7.7</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

