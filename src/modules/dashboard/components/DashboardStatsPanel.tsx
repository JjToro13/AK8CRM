import { cn } from "../../../lib/utils";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";

type DashboardStatsPanelProps = {
  completed: number;
  inProgress: number;
  noAnswer: number;
  today: number;
};

export default function DashboardStatsPanel({
  completed,
  inProgress,
  noAnswer,
  today,
}: DashboardStatsPanelProps) {
  return (
    <section className={dashboardCardClass}>
      <h2 className={dashboardTitleClass}>Estadisticas</h2>
      <p className={cn(dashboardSubTextClass, "mt-1")}>
        Resumen rapido de tu actividad.
      </p>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface2 px-4 py-3">
          <span className="text-sm text-muted">Llamadas hoy</span>
          <span className="text-sm font-semibold text-ink">{today}</span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface2 px-4 py-3">
          <span className="text-sm text-muted">En progreso</span>
          <span className="text-sm font-semibold text-brand">{inProgress}</span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface2 px-4 py-3">
          <span className="text-sm text-muted">Completadas</span>
          <span className="text-sm font-semibold text-green-600">
            {completed}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface2 px-4 py-3">
          <span className="text-sm text-muted">Sin respuesta</span>
          <span className="text-sm font-semibold text-yellow-600">
            {noAnswer}
          </span>
        </div>
      </div>
    </section>
  );
}
