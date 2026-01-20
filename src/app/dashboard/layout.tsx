import type { ReactNode } from "react";
import { auth } from "../api/auth/auth";
import DashboardShell from "./dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  const userName = session?.user?.name ?? "Usuario";
  const role = session?.user?.role;

  return (
    <DashboardShell userName={userName} role={role}>
      {children}
    </DashboardShell>
  );
}
