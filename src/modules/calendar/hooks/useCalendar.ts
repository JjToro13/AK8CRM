import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import type { Agent } from "../../../shared/types/crm";
import { notify } from "../../../shared/lib/notify";
import { agents } from "../../agents/services/agents.service";
import {
  addWeeks,
  buildCalendarWeekDays,
  createDefaultScheduleForDay,
  formatWeekRange,
  getBrowserTimeZone,
  startOfWeekMonday,
} from "../domain/calendar-date";
import { calendar } from "../services/calendar.service";
import type {
  CalendarAgentFilter,
  ScheduledCall,
} from "../types/calendar.types";
import {
  countScheduledCallsByDisplayStatus,
  shouldOpenScheduledCallFollowUp,
} from "../types/calendar.types";

export function useCalendar() {
  const {
    user,
    isAdmin,
    canSeeAllOperations,
    operationReady,
    activeOperationId,
    operationId,
  } = useAuth();

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [events, setEvents] = useState<ScheduledCall[]>([]);
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] =
    useState<CalendarAgentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduledCall | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  const viewerAgentId = user?.id ?? null;
  const targetOperationId = canSeeAllOperations
    ? (activeOperationId ?? null)
    : (operationId ?? null);
  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);

  const loadAgents = useCallback(async () => {
    if (!isAdmin) {
      setAgentsList([]);
      return;
    }

    const { data, error: agentsError } = await agents.getAll();

    if (agentsError) {
      console.error("Error cargando agentes del calendario:", agentsError);
      return;
    }

    const nextAgents = (data ?? [])
      .filter(
        (agent) =>
          agent.role === "agent" &&
          agent.is_active !== false &&
          (!targetOperationId || agent.operation_id === targetOperationId),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    setAgentsList(nextAgents);
  }, [isAdmin, targetOperationId]);

  const loadEvents = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      if ((isAdmin || canSeeAllOperations) && (!targetOperationId || !operationReady)) {
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const effectiveAgentId = isAdmin
        ? selectedAgentId === "all"
          ? null
          : selectedAgentId
        : viewerAgentId;

      const { data, error: eventsError } = await calendar.listWeek({
        weekStart,
        operationId: targetOperationId,
        agentId: effectiveAgentId,
      });

      if (eventsError) {
        console.error("Error cargando agenda:", eventsError);
        setError(eventsError.message);
        setEvents([]);
      } else {
        setEvents(data ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [
      canSeeAllOperations,
      isAdmin,
      operationReady,
      selectedAgentId,
      targetOperationId,
      user,
      viewerAgentId,
      weekStart,
    ],
  );

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const counts = useMemo(() => {
    return countScheduledCallsByDisplayStatus(events);
  }, [events]);

  const selectedAgent = useMemo(() => {
    if (!isAdmin || selectedAgentId === "all") return null;
    return agentsList.find((agent) => agent.id === selectedAgentId) ?? null;
  }, [agentsList, isAdmin, selectedAgentId]);

  const effectiveTimeZone = useMemo(() => getBrowserTimeZone(), []);

  const weekDays = useMemo(
    () => buildCalendarWeekDays(weekStart, events, effectiveTimeZone),
    [effectiveTimeZone, events, weekStart],
  );

  const goToPreviousWeek = useCallback(() => {
    setAnchorDate((current) => addWeeks(current, -1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setAnchorDate((current) => addWeeks(current, 1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const resetModalState = useCallback(() => {
    setEventModalOpen(false);
    setFollowUpModalOpen(false);
    setSelectedEvent(null);
    setDraftDate(null);
  }, []);

  const openCreateModal = useCallback((date?: Date | null) => {
    setFollowUpModalOpen(false);
    setSelectedEvent(null);
    setDraftDate(date ? createDefaultScheduleForDay(date) : new Date());
    setEventModalOpen(true);
  }, []);

  const openEditModal = useCallback((event: ScheduledCall) => {
    setFollowUpModalOpen(false);
    setSelectedEvent(event);
    setDraftDate(new Date(event.scheduled_for));
    setEventModalOpen(true);
  }, []);

  const openFollowUpModal = useCallback((event: ScheduledCall) => {
    setEventModalOpen(false);
    setSelectedEvent(event);
    setDraftDate(new Date(event.scheduled_for));
    setFollowUpModalOpen(true);
  }, []);

  const openEventModal = useCallback((event: ScheduledCall) => {
    if (shouldOpenScheduledCallFollowUp(event)) {
      openFollowUpModal(event);
      return;
    }

    openEditModal(event);
  }, [openEditModal, openFollowUpModal]);

  const closeEventModal = useCallback(() => {
    setEventModalOpen(false);

    if (!followUpModalOpen) {
      setSelectedEvent(null);
      setDraftDate(null);
    }
  }, [followUpModalOpen]);

  const closeFollowUpModal = useCallback(() => {
    setFollowUpModalOpen(false);

    if (!eventModalOpen) {
      setSelectedEvent(null);
      setDraftDate(null);
    }
  }, [eventModalOpen]);

  const handleCreate = useCallback(
    async (payload: Parameters<typeof calendar.create>[0]) => {
      setSaving(true);
      const { error: createError } = await calendar.create(payload);
      setSaving(false);

      if (createError) {
        setError(createError.message);
        return { error: createError };
      }

      notify.appointmentCreated();
      resetModalState();
      await loadEvents({ silent: true });
      return { error: null };
    },
    [loadEvents, resetModalState],
  );

  const handleUpdate = useCallback(
    async (id: string, payload: Parameters<typeof calendar.update>[1]) => {
      setSaving(true);
      const { error: updateError } = await calendar.update(id, payload);
      setSaving(false);

      if (updateError) {
        setError(updateError.message);
        return { error: updateError };
      }

      if (payload.status && payload.status !== "scheduled") {
        notify.followUpSaved();
      } else {
        notify.appointmentUpdated();
      }
      resetModalState();
      await loadEvents({ silent: true });
      return { error: null };
    },
    [loadEvents, resetModalState],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setSaving(true);
      const { error: deleteError } = await calendar.remove(id);
      setSaving(false);

      if (deleteError) {
        setError(deleteError.message);
        return { error: deleteError };
      }

      notify.appointmentDeleted();
      resetModalState();
      await loadEvents({ silent: true });
      return { error: null };
    },
    [loadEvents, resetModalState],
  );

  return {
    isAdmin,
    canSeeAllOperations,
    operationReady,
    targetOperationId,
    viewerAgentId,
    effectiveTimeZone,
    loading,
    refreshing,
    saving,
    error,
    events,
    weekStart,
    weekLabel: formatWeekRange(weekStart, effectiveTimeZone),
    weekDays,
    counts,
    agentsList,
    selectedAgentId,
    selectedAgent,
    setSelectedAgentId,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    reload: loadEvents,
    modalOpen: eventModalOpen,
    followUpModalOpen,
    selectedEvent,
    draftDate,
    openCreateModal,
    openEventModal,
    openEditModal,
    openFollowUpModal,
    closeModal: closeEventModal,
    closeEventModal,
    closeFollowUpModal,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
