import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "../api/auth/auth";
import DashboardShell from "./dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userName = session?.user?.name ?? "Usuario";
  const role = session?.user?.role;
  const mustChangePassword = session?.user?.passwordMustChange ?? false;

  return (
    <DashboardShell
      userName={userName}
      role={role}
      mustChangePassword={mustChangePassword}
    >
      {children}
    </DashboardShell>
  );
}

