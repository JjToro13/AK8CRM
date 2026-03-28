import type { Agent } from "../../../lib/supabase";
import AgentCard from "./AgentCard";

type AgentsGridProps = {
  agentsList: Agent[];
  assignedCounts: Record<string, number>;
  canAssignClients: boolean;
  canEditAgents: boolean;
  onAssign: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onViewDetails: (agent: Agent) => void;
  roleBadgeClass: (role: Agent["role"]) => string;
  roleLabelFor: (role: Agent["role"]) => string;
  totalAvailable: number;
  canReceiveAssignments: (role: Agent["role"]) => boolean;
};

export default function AgentsGrid({
  agentsList,
  assignedCounts,
  canAssignClients,
  canEditAgents,
  onAssign,
  onEdit,
  onViewDetails,
  roleBadgeClass,
  roleLabelFor,
  totalAvailable,
  canReceiveAssignments,
}: AgentsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agentsList.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          assignedCount={assignedCounts[agent.id] ?? 0}
          canAssignClients={canAssignClients}
          canEdit={canEditAgents}
          onAssign={onAssign}
          onEdit={onEdit}
          onViewDetails={onViewDetails}
          roleLabel={roleLabelFor(agent.role)}
          roleBadgeClass={roleBadgeClass}
          totalAvailable={totalAvailable}
          canReceiveAssignments={canReceiveAssignments(agent.role)}
        />
      ))}
    </div>
  );
}
