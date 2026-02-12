"use server";

import { prisma } from "./prisma";
import { sendDbUsageAlertEmail } from "./mailer";

export type DbUsageLevel = "ok" | "warning" | "high" | "critical";

export type DbUsageStats = {
  bytes: number;
  mb: number;
  limitMb: number;
  percent: number;
  level: DbUsageLevel;
  planLabel: string;
};

const DEFAULT_FREE_LIMIT_MB = 500;
const DEFAULT_PRO_LIMIT_MB = 8192;

const parseLimitMb = () => {
  const raw = process.env.DB_SIZE_LIMIT_MB ?? "";
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolvePlan = () => {
  const plan = (process.env.SUPABASE_PLAN ?? "FREE").toUpperCase();
  return plan === "PRO" || plan === "ENTERPRISE" ? plan : "FREE";
};

const resolveLimitMb = () => {
  const override = parseLimitMb();
  if (override) return override;
  const plan = resolvePlan();
  return plan === "FREE" ? DEFAULT_FREE_LIMIT_MB : DEFAULT_PRO_LIMIT_MB;
};

const resolveLevel = (percent: number): DbUsageLevel => {
  if (percent >= 90) return "critical";
  if (percent >= 80) return "high";
  if (percent >= 70) return "warning";
  return "ok";
};

const levelRank: Record<DbUsageLevel, number> = {
  ok: 0,
  warning: 1,
  high: 2,
  critical: 3,
};

export const getDbUsageStats = async (): Promise<DbUsageStats> => {
  const result = await prisma.$queryRaw<
    { size: bigint | number | string | null }[]
  >`select pg_database_size(current_database()) as size`;
  const raw = result[0]?.size ?? 0;
  const bytes =
    typeof raw === "bigint"
      ? Number(raw)
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : Number(raw);
  const safeBytes = Number.isFinite(bytes) ? bytes : 0;
  const mb = safeBytes / (1024 * 1024);
  const limitMb = resolveLimitMb();
  const percent = limitMb > 0 ? (mb / limitMb) * 100 : 0;
  const level = resolveLevel(percent);
  const planLabel = resolvePlan();
  return { bytes: safeBytes, mb, limitMb, percent, level, planLabel };
};

export const maybeSendDbUsageAlert = async (stats: DbUsageStats) => {
  const alertEmail = process.env.ALERT_EMAIL ?? "";
  if (stats.level === "ok") {
    const current = await prisma.dbUsageAlert.findUnique({
      where: { id: "singleton" },
      select: { lastLevel: true },
    });
    if (current?.lastLevel) {
      await prisma.dbUsageAlert.upsert({
        where: { id: "singleton" },
        update: { lastLevel: null, lastSizeMb: stats.mb, lastNotifiedAt: null },
        create: {
          id: "singleton",
          lastLevel: null,
          lastSizeMb: stats.mb,
          lastNotifiedAt: null,
        },
      });
    }
    return;
  }

  if (!alertEmail) {
    return;
  }

  const current = await prisma.dbUsageAlert.findUnique({
    where: { id: "singleton" },
    select: { lastLevel: true },
  });

  const currentLevel = (current?.lastLevel as DbUsageLevel | null) ?? "ok";
  if (levelRank[stats.level] <= levelRank[currentLevel]) {
    return;
  }

  const sent = await sendDbUsageAlertEmail({
    to: alertEmail,
    stats,
  });

  if (!sent) {
    return;
  }

  await prisma.dbUsageAlert.upsert({
    where: { id: "singleton" },
    update: {
      lastLevel: stats.level,
      lastSizeMb: stats.mb,
      lastNotifiedAt: new Date(),
    },
    create: {
      id: "singleton",
      lastLevel: stats.level,
      lastSizeMb: stats.mb,
      lastNotifiedAt: new Date(),
    },
  });
};
