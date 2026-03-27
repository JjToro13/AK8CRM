import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import {
  dashboardCardClass,
  dashboardPrimaryActionClass,
} from "../../dashboard/components/dashboardUi";
import { formatTime } from "../domain/calendar-date";
import { useCalendar } from "../hooks/useCalendar";
import { resolveScheduledCallDisplayStatus } from "../types/calendar.types";
import CalendarEventModal from "./CalendarEventModal";
import CalendarFollowUpModal from "./CalendarFollowUpModal";
import CalendarStatusLegend from "./CalendarStatusLegend";

export default function DashboardCalendarPanel() {
  const {
    isAdmin,
    operationReady,
    targetOperationId,
    viewerAgentId,
    effectiveTimeZone,
    loading,
    refreshing,
    saving,
    error,
    counts,
    agentsList,
    selectedAgentId,
    setSelectedAgentId,
    weekLabel,
    weekDays,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    reload,
    modalOpen,
    followUpModalOpen,
    selectedEvent,
    draftDate,
    openCreateModal,
    openEventModal,
    openEditModal,
    closeModal,
    closeFollowUpModal,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useCalendar();

  const workWeekDays = useMemo(
    () =>
      weekDays.filter((day) => {
        const dayOfWeek = day.date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      }),
    [weekDays],
  );

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    if (workWeekDays.length === 0) {
      setSelectedDayKey(null);
      return;
    }

    const currentSelectionStillVisible = workWeekDays.some(
      (day) => day.key === selectedDayKey,
    );
    if (currentSelectionStillVisible) return;

    const preferredDay =
      workWeekDays.find((day) => day.isToday) ??
      workWeekDays.find((day) => day.events.length > 0) ??
      workWeekDays[0];

    setSelectedDayKey(preferredDay.key);
  }, [selectedDayKey, workWeekDays]);

  const selectedDay =
    workWeekDays.find((day) => day.key === selectedDayKey) ?? workWeekDays[0] ?? null;

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              <CalendarDays className="h-3.5 w-3.5" />
              Agenda semanal
            </div>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <div className="rounded-full border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-ink">
                  {weekLabel}
                </div>
                <div className="rounded-full border border-border bg-surface2 px-4 py-2 text-sm text-muted">
                  {counts.total} cita{counts.total === 1 ? "" : "s"}
                </div>
                <CalendarStatusLegend counts={counts} compact />
              </div>
              <p className="mt-2 text-xs text-muted">
                Cada cita conserva la zona horaria con la que fue pactada. Las vencidas siguen agendadas hasta que las cierres.
              </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {isAdmin ? (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="h-10 min-w-[13.5rem] bg-surface">
                  <SelectValue placeholder="Todos los agentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los agentes</SelectItem>
                  {agentsList.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-full border border-border bg-surface2 px-4 py-2 text-sm text-muted">
                Mis citas
              </div>
            )}

            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
              <button
                type="button"
                onClick={goToPreviousWeek}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface2 hover:text-brand"
                aria-label="Semana anterior"
                title="Semana anterior"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={goToCurrentWeek}
                className="inline-flex h-8 rounded-full px-3 text-sm font-semibold text-ink/80 transition hover:bg-surface2 hover:text-brand"
              >
                Hoy
              </button>

              <button
                type="button"
                onClick={goToNextWeek}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface2 hover:text-brand"
                aria-label="Semana siguiente"
                title="Semana siguiente"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => reload({ silent: true })}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink/80 transition hover:bg-surface2 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={refreshing}
            >
              {refreshing ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => openCreateModal()}
              className={dashboardPrimaryActionClass}
              disabled={!operationReady || !targetOperationId}
            >
              <Plus className="h-4 w-4" />
              Nueva cita
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!targetOperationId && isAdmin ? (
        <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Selecciona una operación para cargar el calendario.
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex justify-center">
          <LoadingSpinner size="md" text="Cargando agenda..." fullScreen={false} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {workWeekDays.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={cn(
                  "rounded-[1.2rem] border px-4 py-3 text-left transition",
                  day.key === selectedDay?.key
                    ? "border-brand/30 bg-brand/[0.06] shadow-[0_14px_28px_rgba(59,130,246,0.10)]"
                    : "border-border bg-surface hover:border-brand/20 hover:bg-surface2/80",
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {day.shortLabel}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-2xl border text-xs font-semibold",
                      day.isToday
                        ? "border-brand/30 bg-brand/10 text-brand"
                        : "border-border bg-surface2 text-ink/80",
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {day.events.length} cita{day.events.length === 1 ? "" : "s"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedDay ? (
            <div className="mt-4 rounded-[1.35rem] border border-border bg-surface2/35 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {selectedDay.isToday
                      ? `Hoy · ${selectedDay.label} ${selectedDay.dayNumber}`
                      : `${selectedDay.label} · ${selectedDay.dayNumber}`}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {selectedDay.events.length} cita{selectedDay.events.length === 1 ? "" : "s"} para este día
                  </p>
                </div>
              </div>

              {selectedDay.events.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted">
                  No hay citas para este día.
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {selectedDay.events.map((event) => {
                    const status = resolveScheduledCallDisplayStatus(event);
                    const clientName = [event.client?.first_name, event.client?.last_name]
                      .filter(Boolean)
                      .join(" ")
                      .trim();

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => openEventModal(event)}
                        className={cn(
                          "w-full rounded-[1.2rem] border border-border border-l-[3px] bg-surface px-4 py-3 text-left transition hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
                          status.cardClass,
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                            <span
                              className={cn(
                                "inline-block h-2.5 w-2.5 rounded-full",
                                status.dotClass,
                              )}
                            />
                            <span>{status.label}</span>
                            <span className="text-border">·</span>
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatTime(
                                event.scheduled_for,
                                event.scheduled_timezone ?? effectiveTimeZone,
                              )}
                            </span>
                          </div>

                          <p className="mt-2 truncate text-sm font-semibold text-ink">
                            {event.title?.trim() ||
                              clientName ||
                              event.client?.serial ||
                              "Cita agendada"}
                          </p>

                          <p className="mt-1 truncate text-[11px] text-muted">
                            {clientName || "Cliente sin nombre"} - {event.client?.serial}
                          </p>

                          {isAdmin && event.agent?.name ? (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted">
                              <UserRound className="h-3.5 w-3.5" />
                              <span className="truncate">{event.agent.name}</span>
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      <CalendarEventModal
        isOpen={modalOpen}
        onClose={closeModal}
        event={selectedEvent}
        draftDate={draftDate}
        isAdmin={isAdmin}
        viewerAgentId={viewerAgentId}
        presetAgentId={selectedAgentId === "all" ? null : selectedAgentId}
        targetOperationId={targetOperationId}
        agentsList={agentsList}
        viewerTimeZone={effectiveTimeZone}
        saving={saving}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <CalendarFollowUpModal
        isOpen={followUpModalOpen}
        event={selectedEvent}
        saving={saving}
        onClose={closeFollowUpModal}
        onOpenEdit={openEditModal}
        onUpdate={handleUpdate}
      />

    </section>
  );
}
