import { getDbUsageStats, maybeSendDbUsageAlert } from "../../lib/db-usage";

const formatMb = (value: number) => `${value.toFixed(2)} MB`;

const levelConfig = {
  ok: {
    label: "Uso normal",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  },
  warning: {
    label: "Aviso",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
  },
  high: {
    label: "Alerta alta",
    tone: "bg-orange-50 text-orange-700 border-orange-200",
    bar: "bg-orange-500",
  },
  critical: {
    label: "Critico",
    tone: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
  },
} as const;

export default async function DbUsageCard() {
  const stats = await getDbUsageStats();
  await maybeSendDbUsageAlert(stats);

  const level = levelConfig[stats.level];
  const percent = Math.min(100, stats.percent);
  const alertEmail = process.env.ALERT_EMAIL ?? "";
  const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  const emailStatus = !alertEmail
    ? "Alertas por email desactivadas (configura ALERT_EMAIL)"
    : smtpReady
      ? `Alertas por email: ${alertEmail}`
      : "ALERT_EMAIL configurado, pero falta SMTP (SMTP_HOST/SMTP_FROM)";

  return (
    <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Sistema
          </p>
          <h3 className="text-2xl font-semibold text-slate-900">
            Uso de base de datos
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Plan {stats.planLabel}. Limite configurado {formatMb(stats.limitMb)}.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${level.tone}`}>
          {level.label}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Uso actual</span>
          <span>
            {formatMb(stats.mb)} ({stats.percent.toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100">
          <div
            className={`h-3 rounded-full ${level.bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Umbrales: 70% aviso · 80% alerta alta · 90% critico</span>
          <span>{emailStatus}</span>
        </div>
      </div>
    </section>
  );
}
