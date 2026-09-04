import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "../api/auth/auth";
import { getDashboardNotificationSummary } from "../lib/dashboard-notifications";
import DashboardShell from "./dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  let session = null;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userName = session?.user?.name ?? "Usuario";
  const userId = session.user.id;
  const role = session?.user?.role;
  const mustChangePassword = session?.user?.passwordMustChange ?? false;
  const notificationSummary = await getDashboardNotificationSummary(userId, role);

  return (
    <DashboardShell
      userName={userName}
      role={role}
      mustChangePassword={mustChangePassword}
      notificationSummary={notificationSummary}
    >
      {children}
    </DashboardShell>
  );
}

