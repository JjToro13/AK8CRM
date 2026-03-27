import { Users } from "lucide-react";
import AgentDetailsModal from "./AgentDetailsModal";
import AgentUpsertModal from "./AgentUpsertModal";
import AssignmentModal from "./AssignmentModal";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import type { Agent } from "../../../lib/supabase";
import { cn } from "../../../lib/utils";
import { useAgentManagement } from "../hooks/useAgentManagement";
import type { AgentManagementProps } from "../types/agent-management.types";
import AgentManagementErrorCard from "./AgentManagementErrorCard";
import AgentManagementHeader from "./AgentManagementHeader";
import AgentsGrid from "./AgentsGrid";
import AvailableCampaignsCard from "./AvailableCampaignsCard";

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";
const titleClass = "text-base sm:text-lg font-semibold tracking-tight text-ink";

function roleBadgeClass(role: Agent["role"]) {
  switch (role) {
    case "dev":
      return "border border-violet-200 bg-violet-50 text-violet-700";
    case "super_admin":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "admin":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "agent":
    default:
      return "border border-brand/20 bg-brand/10 text-ink/80";
  }
}

export default function AgentManagementView(props: AgentManagementProps) {
  const {
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
      <div className={cn(cardClass, "bg-surface2")}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand" />
          </div>
          <div>
            <div className={titleClass}>Gestion de Agentes</div>
            <div className="text-sm text-muted">
              Disponible solo para administradores.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <AgentManagementErrorCard error={error} /> : null}

      {!compact ? (
        <AgentManagementHeader
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
        isAdmin={isAdmin}
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
