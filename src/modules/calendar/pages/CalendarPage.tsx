import {
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import GeneralNoticeModal from "../../../shared/components/feedback/GeneralNoticeModal";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import { useCalendar } from "../hooks/useCalendar";
import CalendarEventModal from "../components/CalendarEventModal";
import CalendarFollowUpModal from "../components/CalendarFollowUpModal";
import CalendarAgendaList from "../components/CalendarAgendaList";
import CalendarStatusLegend from "../components/CalendarStatusLegend";
import CalendarWeekBoard from "../components/CalendarWeekBoard";

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";
const CALENDAR_UPDATES_NOTICE_KEY = "calendar_updates_notice_v1";

export default function CalendarPage() {
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

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [updatesNoticeOpen, setUpdatesNoticeOpen] = useState(true);

  useEffect(() => {
    if (weekDays.length === 0) {
      setSelectedDayKey(null);
      return;
    }

    const stillVisible = weekDays.some((day) => day.key === selectedDayKey);
    if (stillVisible) return;

    const preferredDay =
      weekDays.find((day) => day.isToday) ??
      weekDays.find((day) => day.events.length > 0) ??
      weekDays[0];

    setSelectedDayKey(preferredDay.key);
  }, [selectedDayKey, weekDays]);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<CalendarDays className="h-5 w-5 text-brand" />}
        title="Calendario Comercial"
        subtitle={
          <span className="text-xs text-muted hidden sm:inline">
            Agenda semanal, seguimiento y control por agente
          </span>
        }
        actions={
          <>
            <Link to="/dashboard" className={pageHeaderActionClassName}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>

            <button
              type="button"
              onClick={() => reload({ silent: true })}
              className={pageHeaderActionClassName}
              disabled={refreshing}
            >
              {refreshing ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Recargar
            </button>

            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 transition disabled:opacity-50"
              disabled={!operationReady || !targetOperationId}
            >
              <Plus className="h-4 w-4" />
              Nueva cita
            </button>
          </>
        }
        meta={
          <div className="text-xs text-muted">
            {counts.total.toLocaleString()} citas esta semana
            {counts.overdue > 0
              ? ` · ${counts.overdue.toLocaleString()} vencida${counts.overdue === 1 ? "" : "s"}`
              : ""}
          </div>
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="violet" contentClassName="space-y-6">
          <GeneralNoticeModal
            open={updatesNoticeOpen}
            onClose={() => setUpdatesNoticeOpen(false)}
            dismissKey={CALENDAR_UPDATES_NOTICE_KEY}
            variant="info"
            title="Cambios en calendario"
            message={
              <>
                <p className="mb-2">
                  Las citas futuras se siguen editando igual.
                </p>
                <p className="text-sm">
                  Las citas vencidas ahora abren un seguimiento rápido para
                  marcarlas como atendidas, pospuestas o pérdidas.
                </p>
              </>
            }
            primaryText="Entendido"
          />

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!targetOperationId && isAdmin ? (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Selecciona una operación activa para usar el calendario.
            </div>
          ) : null}

          <section className={cardClass}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                    Planeación semanal
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
                      <SelectTrigger className="h-10 min-w-[14rem] bg-surface">
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
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-brand via-brand-600 to-brand-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 active:brightness-95 disabled:opacity-50"
                    disabled={!operationReady || !targetOperationId}
                  >
                    <Plus className="h-4 w-4" />
                    Nueva cita
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            {loading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="md" text="Cargando calendario..." fullScreen={false} />
              </div>
            ) : (
              <CalendarWeekBoard
                weekDays={weekDays}
                showAgentName={isAdmin && selectedAgentId === "all"}
                onCreateForDay={openCreateModal}
                onSelectEvent={openEventModal}
                onSelectDay={setSelectedDayKey}
                selectedDayKey={selectedDayKey}
                showCreateButton={false}
                timeZone={effectiveTimeZone}
              />
            )}
          </section>

          {!loading ? (
            <CalendarAgendaList
              weekDays={weekDays}
              selectedDayKey={selectedDayKey}
              onSelectEvent={openEventModal}
              timeZone={effectiveTimeZone}
            />
          ) : null}
        </PageStage>
      </main>

      <AppFooter note="Agenda comercial semanal, seguimiento por agente y estado operativo de citas." />

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
    </div>
  );
}
