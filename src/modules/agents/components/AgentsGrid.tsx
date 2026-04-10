import type { Agent } from "../../../lib/supabase";
import { cn } from "../../../lib/utils";
import AgentCard from "./AgentCard";
import {
  agentCardClass,
  agentEyebrowClass,
  agentInsetClass,
  agentSubTextClass,
  agentTitleClass,
} from "./agentUi";

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
  if (agentsList.length === 0) {
    return (
      <section className={agentCardClass}>
        <div className={agentEyebrowClass}>Equipo operativo</div>
        <h3 className={cn(agentTitleClass, "mt-4")}>Sin usuarios visibles</h3>
        <p className={cn(agentSubTextClass, "mt-1")}>
          Cuando existan agentes activos para tu alcance operativo, apareceran aqui.
        </p>
        <div className={cn(agentInsetClass, "mt-5 p-8 text-center text-sm text-muted")}>
          Todavia no hay usuarios para mostrar en esta vista.
        </div>
      </section>
    );
  }

  return (
    <section className={agentCardClass}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={agentEyebrowClass}>Equipo operativo</div>
          <h3 className={cn(agentTitleClass, "mt-4")}>Usuarios en gestion</h3>
          <p className={cn(agentSubTextClass, "mt-1")}>
            Lectura compacta del estado, la carga asignada y las acciones disponibles.
          </p>
        </div>
        <div className="crm-shell-pill rounded-full border border-white/76 bg-white/72 px-4 py-2 text-sm font-semibold text-ink/80 shadow-[0_12px_26px_rgba(30,41,59,0.06)]">
          {agentsList.length} usuario{agentsList.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}
