import { CalendarDays, Clock3, FileText, UserRound } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  calendarCardClass,
  calendarEyebrowClass,
  calendarInsetClass,
} from "./calendarUi";
import { formatTime } from "../domain/calendar-date";
import {
  resolveScheduledCallDisplayStatus,
  type CalendarWeekDay,
  type ScheduledCall,
} from "../types/calendar.types";

type CalendarAgendaListProps = {
  weekDays: CalendarWeekDay[];
  selectedDayKey?: string | null;
  onSelectEvent?: (event: ScheduledCall) => void;
  timeZone?: string | null;
};

export default function CalendarAgendaList({
  weekDays,
  selectedDayKey,
  onSelectEvent,
  timeZone,
}: CalendarAgendaListProps) {
  const visibleDays = selectedDayKey
    ? weekDays.filter((day) => day.key === selectedDayKey)
    : weekDays;
  const totalEvents = visibleDays.reduce((sum, day) => sum + day.events.length, 0);

  return (
    <section className={calendarCardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={calendarEyebrowClass}>
            <CalendarDays className="h-3.5 w-3.5" />
            Agenda detallada
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <div className="rounded-full border border-white/76 bg-white/72 px-4 py-2 text-sm font-semibold text-ink">
              {selectedDayKey ? "Día detallado" : "Semana detallada"}
            </div>
            <div className="rounded-full border border-white/76 bg-white/72 px-4 py-2 text-sm text-muted">
              {totalEvents} cita{totalEvents === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className={cn(calendarInsetClass, "px-4 py-3 text-right")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {selectedDayKey ? "Total día" : "Total semana"}
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {totalEvents} cita{totalEvents === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {visibleDays.map((day) => (
          <div key={day.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold",
                  day.isToday
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-border bg-surface2 text-ink/80",
                )}
              >
                {day.dayNumber}
              </span>

              <div>
                <p className="text-sm font-semibold text-ink">{day.label}</p>
                <p className="text-xs text-muted">
                  {day.events.length} cita{day.events.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {day.events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/42 px-4 py-5 text-sm text-muted">
                Sin citas para este día.
              </div>
            ) : (
              <div className="space-y-3">
                {day.events.map((event) => {
                  const status = resolveScheduledCallDisplayStatus(event);
                  const clientName = [event.client?.first_name, event.client?.last_name]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent?.(event)}
                      className={cn(
                        "crm-calendar-event-card w-full rounded-[1.4rem] border border-white/72 border-l-4 bg-white/76 px-5 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]",
                        status.cardClass,
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/74 bg-white/68 px-3 py-1 text-xs font-semibold text-ink/75">
                              <Clock3 className="h-3.5 w-3.5 text-muted" />
                              {formatTime(
                                event.scheduled_for,
                                event.scheduled_timezone ?? timeZone,
                              )}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                                status.pillClass,
                              )}
                            >
                              <span className={cn("h-2.5 w-2.5 rounded-full", status.dotClass)} />
                              {status.label}
                            </span>
                          </div>

                          <div>
                            <p className="text-base font-semibold text-ink">
                              {event.title?.trim() ||
                                clientName ||
                                event.client?.serial ||
                                "Cita programada"}
                            </p>
                            <p className="mt-1 text-sm text-muted">
                              {clientName || "Cliente sin nombre"} · {event.client?.serial}
                              {event.campaign?.prefix ? ` · Base ${event.campaign.prefix}` : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                            {event.agent?.name ? (
                              <span className="inline-flex items-center gap-1.5">
                                <UserRound className="h-3.5 w-3.5" />
                                {event.agent.name}
                              </span>
                            ) : null}

                            {event.campaign?.display_name ? (
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {event.campaign.display_name}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="w-full max-w-xl space-y-3">
                          <div className="rounded-2xl border border-white/70 bg-white/56 px-4 py-3">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                              <FileText className="h-3.5 w-3.5" />
                              Notas internas
                            </div>
                            <p className="mt-2 text-sm leading-6 text-ink/85">
                              {event.notes?.trim() || "Sin notas internas."}
                            </p>
                          </div>

                          {event.outcome_notes ? (
                            <div className="rounded-2xl border border-white/70 bg-white/56 px-4 py-3">
                              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                                <FileText className="h-3.5 w-3.5" />
                                Resultado / observación
                              </div>
                              <p className="mt-2 text-sm leading-6 text-ink/85">
                                {event.outcome_notes}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
