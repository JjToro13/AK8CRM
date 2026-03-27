import { Link } from "react-router-dom";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import RecentCalls from "./RecentCalls";
import type { DashboardRecentCallsPanelProps } from "../types/dashboard.types";
import { dashboardCardClass, dashboardTitleClass } from "./dashboardUi";

export default function DashboardRecentCallsPanel({
  callsLoading,
  recentCalls,
}: DashboardRecentCallsPanelProps) {
  return (
    <section className={dashboardCardClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={dashboardTitleClass}>Llamadas Recientes</h2>
        <Link
          to="/calls"
          className="text-sm font-semibold text-brand hover:opacity-90 transition"
        >
          Ver todas
        </Link>
      </div>

      {callsLoading ? (
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
        <div className="text-center text-sm text-muted py-10">
          No hay llamadas recientes
        </div>
      )}
    </section>
  );
}
