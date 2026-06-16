import { useEffect, useMemo, useState } from "react";
import {
  agents,
  canAssignOperationalClients,
  canCreateManagedUsers,
  canEditManagedUsers,
  canOpenManagedUserEditor,
  getAgentManagementVisibleRoles,
  getAgentRoleLabel,
  isOperationalAgentRole,
  type Agent,
} from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { useBackendHealth } from "../../../shared/resilience/BackendHealthProvider";
import { agentManagement } from "../services/agent-management.service";
import type { AgentManagementProps } from "../types/agent-management.types";

const roleSortOrder: Record<Agent["role"], number> = {
  dev: 0,
  owner: 1,
  manager: 2,
  loader: 3,
  agent: 4,
};

const AGENTS_FOCUS_REFRESH_STALE_MS = 90_000;

function sortVisibleAgents(agentsList: Agent[]) {
  return [...agentsList].sort((left, right) => {
    const roleOrder = roleSortOrder[left.role] - roleSortOrder[right.role];
    if (roleOrder !== 0) return roleOrder;
    return left.name.localeCompare(right.name, "es", {
      sensitivity: "base",
    });
  });
}

export function useAgentManagement({ compact }: AgentManagementProps) {
  const {
    activeOperationId,
    canSeeAllOperations,
    loading: authLoading,
    operationId,
    operationReady,
    role,
    user,
  } = useAuth();
  const { reportBackendIssue, reportBackendSuccess, shouldReduceLoad } =
    useBackendHealth();

  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>(
    {},
  );
  const [availableCampaigns, setAvailableCampaigns] = useState<
    Array<{ id: string; prefix: string; display_name: string | null; available: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
  const [lastLoadedAt, setLastLoadedAt] = useState(0);

  const canManageAgents =
    !!role && ["dev", "owner", "manager"].includes(role);
  const canCreateAgents = canCreateManagedUsers(role);
  const canEditAgents = canEditManagedUsers(role);
  const canAssignClients = canAssignOperationalClients(role);
  const scopedOperationId = canSeeAllOperations ? activeOperationId : operationId;

  const totalAvailable = useMemo(
    () =>
      availableCampaigns.reduce(
        (total, campaign) => total + (campaign.available || 0),
        0,
      ),
    [availableCampaigns],
  );

  const loadData = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError("");

    if (shouldReduceLoad) {
      setError("Modo reducido activo. La carga de agentes se pausa temporalmente.");
      setLoading(false);
      return;
    }

    try {
      const visibleRoles = getAgentManagementVisibleRoles(role);
      if (visibleRoles.length === 0) {
        setAgentsList([]);
        setAssignedCounts({});
        setAvailableCampaigns([]);
        return;
      }

      if (!scopedOperationId) {
        setAgentsList([]);
        setAssignedCounts({});
        setAvailableCampaigns([]);
        return;
      }
      const visibleOperationIds = [scopedOperationId];

      const { data: agentsData, error: agentsError } = await agents.getAll();
      if (agentsError) {
        console.error("Error cargando agentes:", agentsError);
        reportBackendIssue(agentsError, "agents:list");
        setError("Error cargando agentes.");
        return;
      }

      const visibleAgents = sortVisibleAgents(
        ((agentsData || []) as Agent[]).filter((agent) =>
          visibleRoles.includes(agent.role) &&
          !!agent.operation_id &&
          visibleOperationIds.includes(agent.operation_id),
        ),
      );

      const operationalAgents = visibleAgents.filter((agent) =>
        isOperationalAgentRole(agent.role),
      );

      const [
        { data: nextAssignedCounts },
        { data: nextAvailableCampaigns, error: campaignsError },
      ] = await Promise.all([
        agentManagement.getAssignedCounts(operationalAgents, visibleOperationIds),
        agentManagement.getAvailableCampaigns(visibleOperationIds),
      ]);

      if (campaignsError) {
        console.warn(
          "No se pudieron calcular las campañas disponibles para el tenant activo.",
          campaignsError,
        );
        reportBackendIssue(campaignsError, "agents:campaigns");
      }

      setAgentsList(visibleAgents);
      setAssignedCounts(nextAssignedCounts);
      setAvailableCampaigns(nextAvailableCampaigns);
      setLastLoadedAt(Date.now());
      reportBackendSuccess("agents:list");
    } catch (error) {
      console.error("Error cargando datos de agentes:", error);
      reportBackendIssue(error, "agents:list");
      setError(
        error instanceof Error ? error.message : "Error inesperado cargando agentes.",
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!canManageAgents) {
      setAgentsList([]);
      setAssignedCounts({});
      setAvailableCampaigns([]);
      setLoading(false);
      return;
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    canManageAgents,
    canSeeAllOperations,
    operationReady,
    role,
    scopedOperationId,
  ]);

  useEffect(() => {
    if (authLoading || !canManageAgents || !scopedOperationId) {
      return;
    }

    const refreshPresence = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoadedAt < AGENTS_FOCUS_REFRESH_STALE_MS) return;
      void loadData({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshPresence();
      }
    };

    window.addEventListener("focus", refreshPresence);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshPresence);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    canManageAgents,
    lastLoadedAt,
    scopedOperationId,
    shouldReduceLoad,
  ]);

  const openCreateAgent = () => {
    if (!canCreateAgents) return;
    setUpsertMode("create");
    setSelectedAgent(null);
    setShowUpsertModal(true);
  };

  const openEditAgent = (agent: Agent) => {
    if (!canOpenManagedUserEditor(role, agent.role, agent.id === user?.id)) {
      return;
    }
    setUpsertMode("edit");
    setSelectedAgent(agent);
    setShowUpsertModal(true);
  };

  const handleCreateAssignment = (agent: Agent) => {
    if (!canAssignClients) return;
    setSelectedAgent(agent);
    setShowAssignmentModal(true);
  };

  const handleViewAgentDetails = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentDetails(true);
  };

  const handleAssignmentCreated = async () => {
    setShowAssignmentModal(false);
    await loadData();
  };

  const handleAgentSaved = async () => {
    setShowUpsertModal(false);
    await loadData();
  };

  return {
    agentsList,
    assignedCounts,
    availableCampaigns,
    canAssignClients,
    canCreateAgents,
    canEditAgents,
    canManageAgents,
    currentUserId: user?.id ?? null,
    compact,
    degradedMode: shouldReduceLoad,
    error,
    getAgentRoleLabel,
    handleAgentSaved,
    handleAssignmentCreated,
    handleCreateAssignment,
    handleViewAgentDetails,
    isOperationalAgentRole,
    loading,
    loadData,
    openCreateAgent,
    openEditAgent,
    selectedAgent,
    setShowAgentDetails,
    setShowAssignmentModal,
    setShowUpsertModal,
    showAgentDetails,
    showAssignmentModal,
    showUpsertModal,
    totalAvailable,
    upsertMode,
    viewerRole: role,
  };
}
