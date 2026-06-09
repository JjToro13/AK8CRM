import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../shared/lib/notify";
import type { Call, Client } from "../../../shared/types/crm";
import { useBackendHealth } from "../../../shared/resilience/BackendHealthProvider";
import {
  getLegacyStatusColor,
  TRANSFERRED_CLIENT_STATUS_CODE,
} from "../../../lib/utils";
import {
  isOperation2faRequiredError,
  notifyOperation2faRequired,
} from "../../../shared/security/operation-2fa-errors";
import { agentNameMap } from "../../../shared/services/agent-name-map";
import { agents } from "../../agents/services/agents.service";
import { calls } from "../../calls/services/calls.service";
import { clients } from "../../clients/services/clients.service";
import { dashboard } from "../services/dashboard.service";
import type { DashboardProps, Operation, VisibleTenant } from "../types/dashboard.types";

const SELECTED_OPERATION_STORAGE_KEY = "cm_selected_operation_id";
const SELECTED_TENANT_STORAGE_KEY = "cm_selected_tenant_id";
const DASHBOARD_SEARCH_DEBOUNCE_MS = 400;

async function enrichSearchClientsWithAssignedAgentNames(clientsList: Client[]) {
  const ids = Array.from(
    new Set(clientsList.map((client) => client.assigned_to).filter(Boolean)),
  ) as string[];

  if (ids.length === 0) {
    return clientsList.map((client) => ({
      ...client,
      assigned_agent: client.assigned_agent ?? null,
    }));
  }

  const map = await agentNameMap(ids);

  return clientsList.map((client) => ({
    ...client,
    assigned_agent: client.assigned_to
      ? { name: map.get(client.assigned_to) ?? client.assigned_to }
      : null,
  }));
}

export function useDashboard({
  isAdmin,
  canSeeAllOperations = false,
  operationReady = true,
}: DashboardProps) {
  const {
    activeOperationId: authActiveOperationId,
    operationId: authOperationId,
    user,
    signOut,
  } = useAuth();
  const { shouldReduceLoad, reportBackendIssue, reportBackendSuccess } =
    useBackendHealth();

  const syncedOperationIdRef = useRef<string | null>(null);
  const searchRequestIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedClientForAssignment, setSelectedClientForAssignment] =
    useState<Client | null>(null);
  const [assignmentAgents, setAssignmentAgents] = useState<
    Array<{ id: string; name: string; email?: string | null }>
  >([]);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [tenants, setTenants] = useState<VisibleTenant[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    null,
  );
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState("");

  const selectedOperation = useMemo(
    () =>
      operations.find((operation) => operation.id === selectedOperationId) ??
      null,
    [operations, selectedOperationId],
  );

  const effectiveOperationId = canSeeAllOperations
    ? (selectedOperationId ?? null)
    : isAdmin
      ? (authOperationId ?? selectedOperationId ?? null)
      : null;

  const opLocked = canSeeAllOperations && !operationReady;

  const loadTenants = useCallback(async () => {
    if (!canSeeAllOperations) {
      setTenants([]);
      setSelectedTenantId(null);
      return;
    }

    const { data, error } = await dashboard.getVisibleTenants();

    if (error) {
      console.error("[tenants] error:", error);
      return;
    }

    const nextTenants = data ?? [];
    setTenants(nextTenants);

    const savedTenantId = localStorage.getItem(SELECTED_TENANT_STORAGE_KEY);
    const resolvedTenantId =
      nextTenants.find((tenant) => tenant.id === savedTenantId)?.id ??
      nextTenants[0]?.id ??
      null;

    setSelectedTenantId(resolvedTenantId);

    if (resolvedTenantId) {
      localStorage.setItem(SELECTED_TENANT_STORAGE_KEY, resolvedTenantId);
    } else {
      localStorage.removeItem(SELECTED_TENANT_STORAGE_KEY);
    }
  }, [canSeeAllOperations]);

  const loadOperations = useCallback(async () => {
    if (!canSeeAllOperations) {
      setOperations([]);
      setOpsError("");
      return;
    }

    if (!selectedTenantId) {
      setOperations([]);
      setSelectedOperationId(null);
      setOpsError("");
      return;
    }

    setOpsLoading(true);
    setOpsError("");
    const tenantIdForRequest = selectedTenantId;

    try {
      const { data, error } = await dashboard.getOperationsByTenant(
        tenantIdForRequest,
      );

      if (error) {
        console.error("[operations] error:", error);
        setOpsError(error.message);
        setOperations([]);
        return;
      }

      setOperations(
        (data ?? []).filter(
          (operation) => operation.tenant_id === tenantIdForRequest,
        ),
      );
    } finally {
      setOpsLoading(false);
    }
  }, [canSeeAllOperations, selectedTenantId]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  useEffect(() => {
    if (!canSeeAllOperations) {
      syncedOperationIdRef.current = null;
      setSelectedTenantId(null);
      setSelectedOperationId(authOperationId ?? authActiveOperationId ?? null);
      return;
    }

    const saved = localStorage.getItem(SELECTED_OPERATION_STORAGE_KEY);
    const visibleOperationIds = new Set(operations.map((operation) => operation.id));
    const nextOperationId =
      (saved && visibleOperationIds.has(saved) ? saved : null) ??
      (authActiveOperationId && visibleOperationIds.has(authActiveOperationId)
        ? authActiveOperationId
        : null) ??
      operations[0]?.id ??
      null;

    setSelectedOperationId(nextOperationId);

    if (!nextOperationId || syncedOperationIdRef.current === nextOperationId) {
      return;
    }

    let cancelled = false;

    const syncOperation = async () => {
      const { error } = await dashboard.setActiveOperation(nextOperationId);

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("[init set_active_operation] error:", error);
        setOpsError(error.message);
        syncedOperationIdRef.current = null;
        return;
      }

      syncedOperationIdRef.current = nextOperationId;
      window.dispatchEvent(
        new CustomEvent("cm:operation-changed", {
          detail: { operationId: nextOperationId },
        }),
      );
    };

    void syncOperation();

    return () => {
      cancelled = true;
    };
  }, [authActiveOperationId, authOperationId, canSeeAllOperations, operations]);

  const loadRecentCalls = useCallback(async (operationId?: string | null) => {
    const resolvedOperationId =
      operationId ?? (isAdmin ? effectiveOperationId : null);

    if (isAdmin && (!resolvedOperationId || !operationReady)) {
      setRecentCalls([]);
      setCallsLoading(false);
      return;
    }

    if (shouldReduceLoad) {
      setCallsLoading(false);
      return;
    }

    setCallsLoading(true);

    try {
      let agentId: string | undefined;

      if (!isAdmin) {
        agentId = user?.id;
      }

      if (!isAdmin && !agentId) {
        setRecentCalls([]);
        return;
      }

      const { data, error } = await calls.getRecent({
        agentId,
        operationId: isAdmin ? resolvedOperationId : null,
      });

      if (error) {
        console.error("Error cargando llamadas:", error);
        reportBackendIssue(error, "dashboard:recentCalls");
        return;
      }

      setRecentCalls(data || []);
      reportBackendSuccess("dashboard:recentCalls");
    } catch (error) {
      console.error("Error cargando llamadas:", error);
      reportBackendIssue(error, "dashboard:recentCalls");
    } finally {
      setCallsLoading(false);
    }
  }, [
    effectiveOperationId,
    isAdmin,
    operationReady,
    reportBackendIssue,
    reportBackendSuccess,
    shouldReduceLoad,
    user,
  ]);

  useEffect(() => {
    void loadRecentCalls();
  }, [loadRecentCalls]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, DASHBOARD_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const runSearch = useCallback(
    async (query: string) => {
      const requestId = ++searchRequestIdRef.current;
      const trimmedQuery = query.trim();

      if (!trimmedQuery || trimmedQuery.length < 2) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      if (shouldReduceLoad) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let agentId: string | undefined;

        if (!isAdmin) {
          agentId = user?.id;
        }

        if (!isAdmin && !agentId) {
          setSearchResults([]);
          return;
        }

        const { data, error } = await clients.search(trimmedQuery, {
          agentId,
          operationId: isAdmin ? effectiveOperationId : undefined,
        });

        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        if (error) {
          console.error("Error buscando clientes:", error);
          reportBackendIssue(error, "dashboard:search");
          return;
        }

        const enrichedResults = await enrichSearchClientsWithAssignedAgentNames(
          data || [],
        );

        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        setSearchResults(enrichedResults);
        reportBackendSuccess("dashboard:search");
      } catch (error) {
        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        console.error("Error buscando clientes:", error);
        reportBackendIssue(error, "dashboard:search");
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      effectiveOperationId,
      isAdmin,
      reportBackendIssue,
      reportBackendSuccess,
      shouldReduceLoad,
      user,
    ],
  );

  const handleSearchInput = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [],
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedSearchQuery.trim() || debouncedSearchQuery.trim().length < 2) {
      return;
    }

    void runSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, effectiveOperationId, runSearch]);

  const handleCallStarted = useCallback(() => {
    void loadRecentCalls();
  }, [loadRecentCalls]);

  const handleEditClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  }, []);

  const handleClientSaved = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      void runSearch(searchQuery);
    }
  }, [runSearch, searchQuery]);

  const closeAssignmentModal = useCallback(() => {
    setShowAssignmentModal(false);
    setSelectedClientForAssignment(null);
    setAssignmentAgents([]);
    setAssignmentSaving(false);
  }, []);

  const handleAssignClient = useCallback(
    async (client: Client) => {
      if (!isAdmin) return;

      setSelectedClientForAssignment(client);
      setShowAssignmentModal(true);
      setAssignmentSaving(false);

      const { data, error } = await agents.getAll();

      if (error) {
        console.error("Error cargando agentes para asignacion:", error);
        setAssignmentAgents([]);
        notify.error(
          "No se pudieron cargar los agentes",
          "Intenta abrir la asignacion nuevamente.",
        );
        return;
      }

      const availableAgents = (data ?? [])
        .filter(
          (agent) =>
            agent.role === "agent" &&
            agent.is_active !== false &&
            (!client.operation_id || agent.operation_id === client.operation_id),
        )
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
          email: agent.email ?? null,
        }));

      const currentAssignedStillMissing =
        client.assigned_to &&
        !availableAgents.some((agent) => agent.id === client.assigned_to);

      setAssignmentAgents(
        currentAssignedStillMissing
          ? [
              {
                id: client.assigned_to!,
                name: client.assigned_agent?.name?.trim() || client.assigned_to!,
                email: null,
              },
              ...availableAgents,
            ]
          : availableAgents,
      );
    },
    [isAdmin],
  );

  const handleAssignmentSaved = useCallback(
    async (agentId: string | null) => {
      if (!selectedClientForAssignment) return;

      setAssignmentSaving(true);

      const previousAgentLabel =
        selectedClientForAssignment.assigned_agent?.name?.trim() || "Sin asignar";
      const nextAgentLabel =
        agentId === null
          ? "Sin asignar"
          : assignmentAgents.find((agent) => agent.id === agentId)?.name ?? agentId;
      const didAgentChange = selectedClientForAssignment.assigned_to !== agentId;

      const { error: updateError } = await clients.update(
        selectedClientForAssignment.id,
        {
          assigned_to: agentId,
          ...(agentId !== null && didAgentChange
            ? {
                status_code: TRANSFERRED_CLIENT_STATUS_CODE,
                status_color: getLegacyStatusColor(
                  TRANSFERRED_CLIENT_STATUS_CODE,
                ),
              }
            : {}),
          updated_at: new Date().toISOString(),
        },
        selectedClientForAssignment.operation_id ?? undefined,
      );

      if (updateError) {
        console.error("Error actualizando asignacion del cliente:", updateError);
        if (isOperation2faRequiredError(updateError)) {
          notifyOperation2faRequired();
          notify.error(
            "Verificacion 2FA vencida",
            "Verifica nuevamente la operacion para poder asignar clientes.",
          );
          setAssignmentSaving(false);
          return;
        }
        notify.error(
          "No se pudo actualizar la asignacion",
          "Vuelve a intentarlo en unos segundos.",
        );
        setAssignmentSaving(false);
        return;
      }

      const assignedAgent = agentId === null ? null : { name: nextAgentLabel };

      setSelectedClient((current) =>
        current && current.id === selectedClientForAssignment.id
          ? {
              ...current,
              assigned_to: agentId,
              assigned_agent: assignedAgent,
              ...(agentId !== null && didAgentChange
                ? {
                    status_code: TRANSFERRED_CLIENT_STATUS_CODE,
                    status_color: getLegacyStatusColor(
                      TRANSFERRED_CLIENT_STATUS_CODE,
                    ),
                  }
                : {}),
            }
          : current,
      );
      setSearchResults((current) =>
        current.map((client) =>
          client.id === selectedClientForAssignment.id
            ? {
                ...client,
                assigned_to: agentId,
                assigned_agent: assignedAgent,
                ...(agentId !== null && didAgentChange
                  ? {
                      status_code: TRANSFERRED_CLIENT_STATUS_CODE,
                      status_color: getLegacyStatusColor(
                        TRANSFERRED_CLIENT_STATUS_CODE,
                      ),
                    }
                  : {}),
              }
            : client,
        ),
      );

      notify.clientAssignmentUpdated(
        `${previousAgentLabel} -> ${nextAgentLabel}`,
      );

      closeAssignmentModal();
    },
    [assignmentAgents, closeAssignmentModal, selectedClientForAssignment],
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error cerrando sesion:", error);
    }
  }, [signOut]);

  const selectOperation = useCallback(
    async (operationId: string) => {
      try {
        setOpsError("");
        searchRequestIdRef.current += 1;
        setSelectedOperationId(operationId);
        setSearchResults([]);
        setLoading(searchQuery.trim().length >= 2);
        localStorage.setItem(SELECTED_OPERATION_STORAGE_KEY, operationId);

        const { error } = await dashboard.setActiveOperation(operationId);

        if (error) {
          console.error("[set_active_operation] error:", error);
          setOpsError(error.message);
          syncedOperationIdRef.current = null;
          return;
        }

        syncedOperationIdRef.current = operationId;

        window.dispatchEvent(
          new CustomEvent("cm:operation-changed", {
            detail: { operationId },
          }),
        );

        await loadRecentCalls(operationId);

        if (searchQuery.trim().length >= 2) {
          await runSearch(searchQuery);
        }
      } catch (error) {
        console.error(error);
        setOpsError(
          error instanceof Error ? error.message : "Error seleccionando operacion",
        );
      }
    },
    [loadRecentCalls, runSearch, searchQuery],
  );

  const selectTenant = useCallback((tenantId: string) => {
    if (!tenantId) return;
    searchRequestIdRef.current += 1;
    setSelectedTenantId(tenantId);
    setSelectedOperationId(null);
    setRecentCalls([]);
    setSearchResults([]);
    setLoading(searchQuery.trim().length >= 2);
    localStorage.setItem(SELECTED_TENANT_STORAGE_KEY, tenantId);
    localStorage.removeItem(SELECTED_OPERATION_STORAGE_KEY);
    syncedOperationIdRef.current = null;
  }, [searchQuery]);

  const statToday = useMemo(() => {
    const today = new Date().toDateString();

    return recentCalls.filter(
      (call) =>
        new Date(call.start_time || call.created_at).toDateString() === today,
    ).length;
  }, [recentCalls]);

  const statInProgress = useMemo(
    () => recentCalls.filter((call) => call.status === "in_progress").length,
    [recentCalls],
  );

  const statCompleted = useMemo(
    () => recentCalls.filter((call) => call.status === "completed").length,
    [recentCalls],
  );

  const statNoAnswer = useMemo(
    () => recentCalls.filter((call) => call.status === "no_answer").length,
    [recentCalls],
  );

  return {
    callsLoading,
    degradedMode: shouldReduceLoad,
    handleCallStarted,
    handleClientSaved,
    handleEditClient,
    handleSearchInput,
    handleSignOut,
    loading,
    opLocked,
    operations,
    opsError,
    opsLoading,
    recentCalls,
    searchQuery,
    searchResults,
    assignmentAgents,
    assignmentSaving,
    closeAssignmentModal,
    handleAssignClient,
    handleAssignmentSaved,
    selectedClient,
    selectedClientForAssignment,
    selectedTenantId,
    selectedOperation,
    selectedOperationId,
    selectOperation,
    selectTenant,
    showAssignmentModal,
    setShowEditModal,
    showEditModal,
    statCompleted,
    statInProgress,
    statNoAnswer,
    statToday,
    tenants,
  };
}
