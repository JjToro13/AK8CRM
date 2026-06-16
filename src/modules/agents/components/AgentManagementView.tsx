import { Users } from "lucide-react";
import AgentDetailsModal from "./AgentDetailsModal";
import AgentUpsertModal from "./AgentUpsertModal";
import AssignmentModal from "./AssignmentModal";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import {
  canOpenManagedUserEditor,
  type Agent,
} from "../../../lib/supabase";
import { cn } from "../../../lib/utils";
import { useAgentManagement } from "../hooks/useAgentManagement";
import type { AgentManagementProps } from "../types/agent-management.types";
import AgentManagementErrorCard from "./AgentManagementErrorCard";
import AgentManagementHeader from "./AgentManagementHeader";
import AgentsGrid from "./AgentsGrid";
import AvailableCampaignsCard from "./AvailableCampaignsCard";
import {
  agentCardClass,
  agentEyebrowClass,
  agentSubTextClass,
  agentTitleClass,
} from "./agentUi";

function roleBadgeClass(role: Agent["role"]) {
  switch (role) {
    case "dev":
      return "border border-violet-200/90 bg-violet-50/85 text-violet-700";
    case "owner":
      return "border border-emerald-200/90 bg-emerald-50/85 text-emerald-700";
    case "manager":
      return "border border-sky-200/90 bg-sky-50/85 text-sky-700";
    case "loader":
      return "border border-amber-200/90 bg-amber-50/90 text-amber-700";
    case "agent":
    default:
      return "border border-brand/20 bg-brand/[0.08] text-ink/80";
  }
}

export default function AgentManagementView(props: AgentManagementProps) {
  const {
    agentsList,
    assignedCounts,
    availableCampaigns,
    canAssignClients,
    canCreateAgents,
    canManageAgents,
    compact,
    currentUserId,
    degradedMode,
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
    viewerRole,
  } = useAgentManagement(props);

  if (loading) {
    return (
      <div className="py-14 flex justify-center">
        <LoadingSpinner
          size="sm"
          text="Cargando agentes..."
          fullScreen={false}
        />
      </div>
    );
  }

  if (!canManageAgents) {
    return (
      <div className={cn(agentCardClass, "bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.72))]")}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.35rem] border border-white/72 bg-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
            <Users className="w-5 h-5 text-brand" />
          </div>
          <div>
            <div className={agentEyebrowClass}>Acceso restringido</div>
            <div className={cn(agentTitleClass, "mt-3")}>Gestion de Usuarios</div>
            <div className={agentSubTextClass}>
              Disponible para developer, owner y manager.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <AgentManagementErrorCard error={error} /> : null}

      {degradedMode ? (
        <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          Modo reducido activo. Se pausaron lecturas pesadas de agentes y asignaciones para mantener el CRM accesible.
        </div>
      ) : null}

      {!compact ? (
        <AgentManagementHeader
          canCreateAgent={canCreateAgents}
          degradedMode={degradedMode}
          onCreateAgent={openCreateAgent}
          onRefresh={loadData}
        />
      ) : null}

      <AvailableCampaignsCard
        availableCampaigns={availableCampaigns}
        totalAvailable={totalAvailable}
      />

      <AgentsGrid
        agentsList={agentsList}
        assignedCounts={assignedCounts}
        canAssignClients={canAssignClients}
        canOpenEditorFor={(agent) =>
          canOpenManagedUserEditor(
            viewerRole,
            agent.role,
            agent.id === currentUserId,
          )
        }
        onAssign={handleCreateAssignment}
        onEdit={openEditAgent}
        onViewDetails={handleViewAgentDetails}
        roleBadgeClass={roleBadgeClass}
        roleLabelFor={getAgentRoleLabel}
        totalAvailable={totalAvailable}
        canReceiveAssignments={isOperationalAgentRole}
      />

      {selectedAgent ? (
        <>
          <AssignmentModal
            agent={selectedAgent}
            isOpen={showAssignmentModal}
            onClose={() => setShowAssignmentModal(false)}
            onSuccess={handleAssignmentCreated}
          />

          <AgentDetailsModal
            agent={selectedAgent}
            isOpen={showAgentDetails}
            onClose={() => setShowAgentDetails(false)}
          />
        </>
      ) : null}

      <AgentUpsertModal
        mode={upsertMode}
        agent={upsertMode === "edit" ? selectedAgent : null}
        isOpen={showUpsertModal}
        onClose={() => setShowUpsertModal(false)}
        onSaved={handleAgentSaved}
      />
    </div>
  );
}
