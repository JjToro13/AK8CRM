import { CalendarPlus, Clock, UserRound } from "lucide-react";
import { cn } from "../../../lib/utils";
import { calendarInsetClass } from "./calendarUi";
import { formatTime } from "../domain/calendar-date";
import {
  resolveScheduledCallDisplayStatus,
  type CalendarWeekDay,
  type ScheduledCall,
} from "../types/calendar.types";

type CalendarWeekBoardProps = {
  weekDays: CalendarWeekDay[];
  onCreateForDay?: (date: Date) => void;
  onSelectEvent?: (event: ScheduledCall) => void;
  onSelectDay?: (dayKey: string) => void;
  selectedDayKey?: string | null;
  compact?: boolean;
  showAgentName?: boolean;
  maxVisibleEvents?: number;
  showCreateButton?: boolean;
  timeZone?: string | null;
};

export default function CalendarWeekBoard({
  weekDays,
  onCreateForDay,
  onSelectEvent,
  onSelectDay,
  selectedDayKey,
  compact = false,
  showAgentName = false,
  maxVisibleEvents,
  showCreateButton = true,
  timeZone,
}: CalendarWeekBoardProps) {
  return (
    <div className="overflow-x-auto">
      <div
        className={cn(
          "grid gap-3 pb-1",
          compact ? "min-w-[58rem] grid-cols-7" : "min-w-[78rem] grid-cols-7",
        )}
      >
        {weekDays.map((day) => {
          const visibleEvents =
            typeof maxVisibleEvents === "number"
              ? day.events.slice(0, maxVisibleEvents)
              : day.events;
          const hiddenEvents =
            typeof maxVisibleEvents === "number"
              ? Math.max(day.events.length - maxVisibleEvents, 0)
              : 0;

          return (
            <section
              key={day.key}
              onClick={() => onSelectDay?.(day.key)}
              className={cn(
                calendarInsetClass,
                "rounded-[1.35rem] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition",
                compact ? "min-h-[9.75rem]" : "min-h-[18rem]",
                onSelectDay &&
                  "cursor-pointer hover:border-brand/20 hover:bg-surface/72",
                selectedDayKey === day.key &&
                  "border-brand/30 bg-brand/[0.05] shadow-[0_16px_30px_rgba(59,130,246,0.10)]",
              )}
            >
              <header
                className={cn(
                  "flex items-start justify-between gap-3 border-b border-border px-3.5 py-3",
                  day.isToday && "bg-brand/[0.045]",
                )}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {compact ? day.shortLabel : day.label}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-2xl border font-semibold",
                        compact ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm",
                        day.isToday
                          ? "border-brand/30 bg-brand/10 text-brand"
                          : "border-border bg-surface2 text-ink/80",
                      )}
                    >
                      {day.dayNumber}
                    </span>
                    <span className="text-xs text-muted">
                      {day.events.length} cita{day.events.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {onCreateForDay && showCreateButton ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCreateForDay(day.date);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-border bg-surface2 text-muted transition hover:border-brand/25 hover:bg-brand/5 hover:text-brand"
                    title={`Agendar en ${day.label}`}
                    aria-label={`Agendar en ${day.label}`}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </button>
                ) : null}
              </header>

              <div className="space-y-2.5 p-3">
                {day.events.length === 0 ? (
                  <div
                    className={cn(
                      "crm-empty-state flex items-center justify-center rounded-2xl border border-dashed border-white/70 bg-white/42 text-center text-xs text-muted",
                      compact ? "min-h-[5.25rem]" : "min-h-[12rem]",
                    )}
                >
                  Sin citas
                  </div>
                ) : (
                  visibleEvents.map((event) => {
                    const status = resolveScheduledCallDisplayStatus(event);
                    const clientName = [event.client?.first_name, event.client?.last_name]
                      .filter(Boolean)
                      .join(" ")
                      .trim();

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          onSelectEvent?.(event);
                        }}
                        className={cn(
                          "crm-calendar-event-card w-full rounded-2xl border border-white/72 border-l-[3px] px-3 py-3 text-left transition hover:-translate-y-[1px] hover:shadow-[0_14px_24px_rgba(15,23,42,0.08)]",
                          compact && "px-3 py-2.5 shadow-none",
                          status.cardClass,
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(
                                event.scheduled_for,
                                event.scheduled_timezone ?? timeZone,
                              )}
                            </div>

                            <p className="mt-2 truncate text-sm font-semibold text-ink">
                              {compact ? (
                                <span className="text-[13px] leading-5">
                                  {event.title?.trim() ||
                                    clientName ||
                                    event.client?.serial ||
                                    "Cita"}
                                </span>
                              ) : (
                                event.title?.trim() ||
                                clientName ||
                                event.client?.serial ||
                                "Llamada agendada"
                              )}
                            </p>

                            <p className="mt-1 truncate text-[11px] text-muted">
                              {clientName || "Cliente sin nombre"} - {event.client?.serial}
                            </p>

                            {showAgentName && event.agent?.name ? (
                              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted">
                                <UserRound className="h-3.5 w-3.5" />
                                <span className="truncate">{event.agent.name}</span>
                              </div>
                            ) : null}
                          </div>

                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              status.pillClass,
                            )}
                          >
                            {compact ? status.shortLabel : status.label}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}

                {hiddenEvents > 0 ? (
                  <div className="rounded-full border border-border bg-surface2 px-3 py-2 text-center text-[11px] font-semibold text-muted">
                    +{hiddenEvents} mas
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
