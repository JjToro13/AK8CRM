import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { canUseCalendarWorkspace } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { formatDateTimeLabel } from "../domain/calendar-date";
import { calendar, type CalendarGlobalAlertsSummary } from "../services/calendar.service";
import { formatTimeZoneLabel } from "../../../shared/constants/timezones";
import { cn } from "../../../lib/utils";

const POLL_INTERVAL_MS = 60_000;
const CALENDAR_ALERTS_COLLAPSED_STORAGE_KEY = "ak8crm.calendar-alerts.collapsed";
const expandedPanelPositionClass = "right-0 top-[34%] -translate-y-1/2";
const collapsedPanelPositionClass = "right-0 top-[40%] -translate-y-1/2";
const alertsPanelClass =
  "pointer-events-auto border border-r-0 border-brand/14 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.94))] shadow-[-26px_30px_72px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl";
const alertsGhostButtonClass =
  "inline-flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-ink/84 transition hover:border-brand/24 hover:bg-white/[0.08] hover:text-brand";

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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem(CALENDAR_ALERTS_COLLAPSED_STORAGE_KEY) === "1"
    );
  });
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CALENDAR_ALERTS_COLLAPSED_STORAGE_KEY,
      collapsed ? "1" : "0",
    );
  }, [collapsed]);

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

  if (collapsed) {
    return (
      <div
        className={cn(
          "pointer-events-none fixed z-[95] max-w-[calc(100vw-0.5rem)]",
          collapsedPanelPositionClass,
        )}
      >
        <div
          className={cn(
            alertsPanelClass,
            "flex min-w-[12.25rem] flex-col gap-2 rounded-l-[1.35rem] rounded-r-none px-3 py-3",
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] border border-brand/22 bg-brand/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <CalendarClock className="h-4 w-4 text-brand" />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Agenda
              </div>
              <div className="text-xs font-semibold text-ink">
                {summary.total} pendiente{summary.total === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {summary.overdueCount > 0 ? (
              <span className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-400/25 bg-rose-500/[0.08] px-2 py-1 text-[11px] font-semibold text-rose-200">
                {summary.overdueCount} vencida{summary.overdueCount === 1 ? "" : "s"}
              </span>
            ) : null}

            {summary.upcomingCount > 0 ? (
              <span className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/[0.08] px-2 py-1 text-[11px] font-semibold text-amber-200">
                {summary.upcomingCount} próxima{summary.upcomingCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className={cn(alertsGhostButtonClass, "px-3 py-1.5")}
            title="Expandir calendario"
          >
            Ver agenda
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[95] w-[19.5rem] max-w-[calc(100vw-0.5rem)]",
        expandedPanelPositionClass,
      )}
    >
      <div
        className={cn(
          alertsPanelClass,
          "rounded-l-[1.55rem] rounded-r-none p-4",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-brand/22 bg-brand/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <CalendarClock className="h-5 w-5 text-brand" />
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Calendario
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">
                Seguimiento pendiente
              </div>
              <div className="mt-1 text-xs leading-5 text-muted">
                Recordatorios activos sin salir de esta vista
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className={cn(alertsGhostButtonClass, "h-9 w-9")}
            title="Minimizar calendario"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {summary.overdueCount > 0 ? (
            <div className="rounded-[1rem] border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {summary.overdueCount} vencida{summary.overdueCount === 1 ? "" : "s"}
              </div>
            </div>
          ) : null}

          {summary.upcomingCount > 0 ? (
            <div className="rounded-[1rem] border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                <CalendarClock className="h-3.5 w-3.5" />
                {summary.upcomingCount} próxima{summary.upcomingCount === 1 ? "" : "s"}
              </div>
            </div>
          ) : null}
        </div>

        {summary.nextEvent ? (
          <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/10 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Próximo seguimiento
            </div>
            <div className="mt-2 text-sm font-semibold text-ink/90">
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

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/calendar")}
            className={cn(alertsGhostButtonClass, "flex-1 px-3 py-2")}
          >
            Abrir agenda
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
