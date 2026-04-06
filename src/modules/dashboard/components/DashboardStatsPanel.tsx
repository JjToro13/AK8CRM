import { cn } from "../../../lib/utils";
import {
  dashboardCardClass,
  dashboardSubTextClass,
} from "./dashboardUi";

type DashboardStatsPanelProps = {
  completed: number;
  inProgress: number;
  noAnswer: number;
  today: number;
};

const metricCards = [
  {
    key: "today",
    label: "Llamadas hoy",
    accent: "text-ink",
    tone: "crm-dashboard-stat border-border bg-surface",
  },
  {
    key: "inProgress",
    label: "En progreso",
    accent: "text-brand",
    tone: "crm-dashboard-stat border-brand/18 bg-brand/[0.06]",
  },
  {
    key: "completed",
    label: "Completadas",
    accent: "text-green-600",
    tone: "crm-dashboard-stat crm-dashboard-stat-success border-emerald-200 bg-emerald-50/80",
  },
  {
    key: "noAnswer",
    label: "Sin respuesta",
    accent: "text-yellow-600",
    tone: "crm-dashboard-stat crm-dashboard-stat-warning border-amber-200 bg-amber-50/80",
  },
] as const;

export default function DashboardStatsPanel({
  completed,
  inProgress,
  noAnswer,
  today,
}: DashboardStatsPanelProps) {
  const values = {
    today,
    inProgress,
    completed,
    noAnswer,
  };

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Lectura rapida
          </div>
          <p className={cn(dashboardSubTextClass, "mt-2")}>
            Pulso comercial resumido en una sola franja.
          </p>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <div
              key={metric.key}
              className={cn(
                "rounded-[1.15rem] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]",
                metric.tone,
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {metric.label}
              </div>
              <div className={cn("mt-2 text-2xl font-semibold tracking-tight", metric.accent)}>
                {values[metric.key]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
