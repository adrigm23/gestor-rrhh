export type DashboardNotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

export type DashboardNotificationSummary = {
  total: number;
  items: DashboardNotificationItem[];
};
