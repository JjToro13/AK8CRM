import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { auth, calls as callsService, type Call } from "../../../lib/supabase";
import { useBackendHealth } from "../../../shared/resilience/BackendHealthProvider";
import type { StatusFilter } from "../types/call-history.types";

export interface UseCallHistoryProps {
  isAdmin: boolean;
}

export function useCallHistory({ isAdmin }: UseCallHistoryProps) {
  const {
    activeOperationId,
    canSeeAllOperations,
    operationId,
    operationReady,
  } = useAuth();
  const { reportBackendIssue, reportBackendSuccess, shouldReduceLoad } =
    useBackendHealth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [error, setError] = useState("");

  const effectiveOperationId = canSeeAllOperations
    ? (activeOperationId ?? null)
    : isAdmin
      ? (operationId ?? activeOperationId ?? null)
      : null;

  const loadCalls = useCallback(async ({ silent }: { silent: boolean }) => {
    setError("");

    if (isAdmin && (!operationReady || !effectiveOperationId)) {
      setCalls([]);
      setSelectedCall(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (shouldReduceLoad) {
      setError("Modo reducido activo. El historial de llamadas se pausa temporalmente.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let agentId: string | undefined;

      if (!isAdmin) {
        const currentUser = await auth.getCurrentUser();
        agentId = currentUser?.id;
      }

      const { data, error } = await callsService.getRecent({
        agentId,
        operationId: isAdmin ? effectiveOperationId : null,
      });

      if (error) {
        console.error("Error cargando llamadas:", error);
        reportBackendIssue(error, "calls:list");
        setError("Error cargando historial de llamadas.");
        return;
      }

      setCalls(data || []);
      reportBackendSuccess("calls:list");
    } catch (error) {
      console.error("Error cargando llamadas:", error);
      reportBackendIssue(error, "calls:list");
      setError("Error inesperado cargando llamadas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    effectiveOperationId,
    isAdmin,
    operationReady,
    reportBackendIssue,
    reportBackendSuccess,
    shouldReduceLoad,
  ]);

  useEffect(() => {
    void loadCalls({ silent: false });
  }, [loadCalls]);

  const filteredCalls = useMemo(() => {
    let filtered = [...calls];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      filtered = filtered.filter((call) => {
        const clientName = (
          call.client?.first_name ||
          call.client?.name ||
          ""
        ).toLowerCase();

        const serial = (call.client?.serial || "").toLowerCase();
        const agentName = (call.agent?.name || "").toLowerCase();

        return (
          clientName.includes(normalizedQuery) ||
          serial.includes(normalizedQuery) ||
          agentName.includes(normalizedQuery)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((call) => call.status === statusFilter);
    }

    return filtered;
  }, [calls, searchQuery, statusFilter]);

  useEffect(() => {
    if (!selectedCall) return;

    const stillVisible = filteredCalls.some((call) => call.id === selectedCall.id);
    if (!stillVisible) {
      setSelectedCall(null);
    }
  }, [filteredCalls, selectedCall]);

  return {
    calls,
    degradedMode: shouldReduceLoad,
    error,
    filteredCalls,
    loading,
    refreshing,
    searchQuery,
    selectedCall,
    setSearchQuery,
    setSelectedCall,
    setStatusFilter,
    statusFilter,
    loadCalls,
  };
}
