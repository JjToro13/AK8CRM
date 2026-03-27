import { useEffect, useMemo, useState } from "react";
import {
  agents,
  getAgentManagementVisibleRoles,
  getAgentRoleLabel,
  isOperationalAgentRole,
  type Agent,
} from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { agentManagement } from "../services/agent-management.service";
import type { AgentManagementProps } from "../types/agent-management.types";

const roleSortOrder: Record<Agent["role"], number> = {
  super_admin: 0,
  admin: 1,
  agent: 2,
  dev: 3,
};

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
    isAdmin,
    loading: authLoading,
    operationId,
    operationReady,
    role,
  } = useAuth();

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

  const canManageAgents = isAdmin && !!role;
  const scopedOperationId = canSeeAllOperations ? activeOperationId : operationId;

  const totalAvailable = useMemo(
    () =>
      availableCampaigns.reduce(
        (total, campaign) => total + (campaign.available || 0),
        0,
      ),
    [availableCampaigns],
  );

  const loadData = async () => {
    setLoading(true);
    setError("");

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
      }

      setAgentsList(visibleAgents);
      setAssignedCounts(nextAssignedCounts);
      setAvailableCampaigns(nextAvailableCampaigns);
    } catch (error) {
      console.error("Error cargando datos de agentes:", error);
      setError(
        error instanceof Error ? error.message : "Error inesperado cargando agentes.",
      );
    } finally {
      setLoading(false);
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

  const openCreateAgent = () => {
    setUpsertMode("create");
    setSelectedAgent(null);
    setShowUpsertModal(true);
  };

  const openEditAgent = (agent: Agent) => {
    setUpsertMode("edit");
    setSelectedAgent(agent);
    setShowUpsertModal(true);
  };

  const handleCreateAssignment = (agent: Agent) => {
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
    canManageAgents,
    compact,
    error,
    getAgentRoleLabel,
    handleAgentSaved,
    handleAssignmentCreated,
    handleCreateAssignment,
    handleViewAgentDetails,
    isAdmin,
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
  };
}
