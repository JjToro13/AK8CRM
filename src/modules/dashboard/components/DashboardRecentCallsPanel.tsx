import { Link } from "react-router-dom";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import RecentCalls from "./RecentCalls";
import type { DashboardRecentCallsPanelProps } from "../types/dashboard.types";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";

export default function DashboardRecentCallsPanel({
  callsLoading,
  degradedMode = false,
  recentCalls,
}: DashboardRecentCallsPanelProps) {
  return (
    <section className={dashboardCardClass}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Flujo reciente
          </div>
          <h2 className={dashboardTitleClass}>Llamadas recientes</h2>
          <p className={dashboardSubTextClass}>
            Feed operativo compacto con el tramo mas reciente de actividad.
          </p>
        </div>
        <Link
          to="/calls"
          className="text-sm font-semibold text-brand hover:opacity-90 transition"
        >
          Ver todas
        </Link>
      </div>

      {degradedMode ? (
        <div className="rounded-[1.35rem] border border-dashed border-amber-200 bg-amber-50/80 px-4 py-10 text-center text-sm text-amber-800">
          El feed de llamadas recientes esta pausado temporalmente para reducir carga.
        </div>
      ) : callsLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner
            size="sm"
            text="Cargando llamadas..."
            fullScreen={false}
          />
        </div>
      ) : recentCalls.length > 0 ? (
        <RecentCalls calls={recentCalls.slice(0, 5)} />
      ) : (
        <div className="rounded-[1.35rem] border border-dashed border-border bg-surface2/35 px-4 py-10 text-center text-sm text-muted">
          No hay llamadas recientes
        </div>
      )}
    </section>
  );
}
