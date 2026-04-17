import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock, ChevronRight } from "lucide-react";
import { canUseCalendarWorkspace } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { formatDateTimeLabel } from "../domain/calendar-date";
import { calendar, type CalendarGlobalAlertsSummary } from "../services/calendar.service";
import { formatTimeZoneLabel } from "../../../shared/constants/timezones";
import { cn } from "../../../lib/utils";

const POLL_INTERVAL_MS = 60_000;

const emptySummary: CalendarGlobalAlertsSummary = {
  total: 0,
  overdueCount: 0,
  upcomingCount: 0,
  nextEvent: null,
};

export default function CalendarGlobalAlerts() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    role,
    isAdmin,
    canSeeAllOperations,
    operationReady,
    activeOperationId,
    operationId,
  } = useAuth();
  const [summary, setSummary] =
    useState<CalendarGlobalAlertsSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const lastLoadAtRef = useRef(0);

  const canSeeCalendar = Boolean(user) && canUseCalendarWorkspace(role);
  const targetOperationId = canSeeAllOperations
    ? (activeOperationId ?? null)
    : (operationId ?? null);
  const agentId = isAdmin ? null : (user?.id ?? null);

  const loadAlerts = useCallback(async () => {
    if (!canSeeCalendar) {
      setSummary(emptySummary);
      return;
    }

    if ((isAdmin || canSeeAllOperations) && (!targetOperationId || !operationReady)) {
      setSummary(emptySummary);
      return;
    }

    setLoading(true);
    const { data, error } = await calendar.listGlobalAlerts({
      operationId: targetOperationId,
      agentId,
    });
    setLoading(false);

    if (error) {
      console.error("Error cargando alertas globales de calendario:", error);
      return;
    }

    setSummary(data);
    lastLoadAtRef.current = Date.now();
  }, [
    agentId,
    canSeeAllOperations,
    canSeeCalendar,
    isAdmin,
    operationReady,
    targetOperationId,
  ]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (!canSeeCalendar) return;

    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoadAtRef.current < 20_000) return;
      void loadAlerts();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canSeeCalendar, loadAlerts]);

  const nextClientLabel = useMemo(() => {
    const event = summary.nextEvent;
    if (!event) return "";
    return [event.client?.first_name, event.client?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [summary.nextEvent]);

  if (!canSeeCalendar || location.pathname === "/calendar") {
    return null;
  }

  if (summary.total === 0 && !loading) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[95] w-[22rem] max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto rounded-[1.45rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.88))] p-4 shadow-[0_28px_70px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Calendario
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              Seguimiento pendiente
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/calendar")}
            className="inline-flex items-center gap-1 rounded-full border border-white/76 bg-white/82 px-3 py-1.5 text-xs font-semibold text-ink/82 transition hover:border-brand/20 hover:text-brand"
          >
            Abrir
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {summary.overdueCount > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {summary.overdueCount} vencida{summary.overdueCount === 1 ? "" : "s"}
            </span>
          ) : null}

          {summary.upcomingCount > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <CalendarClock className="h-3.5 w-3.5" />
              {summary.upcomingCount} proxima{summary.upcomingCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {summary.nextEvent ? (
          <div
            className={cn(
              "mt-3 rounded-[1.2rem] border px-3 py-3",
              summary.overdueCount > 0
                ? "border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.92),rgba(255,255,255,0.8))]"
                : "border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,255,255,0.8))]",
            )}
          >
            <div className="text-xs font-semibold text-ink/88">
              {nextClientLabel || summary.nextEvent.client?.serial || "Cliente"}
            </div>
            <div className="mt-1 text-xs text-muted">
              {formatDateTimeLabel(
                summary.nextEvent.scheduled_for,
                summary.nextEvent.scheduled_timezone,
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted">
              {formatTimeZoneLabel(summary.nextEvent.scheduled_timezone)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
