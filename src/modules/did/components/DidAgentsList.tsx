import type { Agent, AgentDidCredentials } from "../../../shared/types/crm";
import DidAgentListItem from "./DidAgentListItem";
import { didCardClass, didTitleClass } from "./didUi";

type DidAgentsListProps = {
  agentsList: Agent[];
  credsByAgentId: Map<string, AgentDidCredentials>;
  deletingAgentId: string | null;
  onDelete: (agentId: string) => void;
  onSelect: (agent: Agent) => void;
  selectedAgentId?: string | null;
};

export default function DidAgentsList({
  agentsList,
  credsByAgentId,
  deletingAgentId,
  onDelete,
  onSelect,
  selectedAgentId,
}: DidAgentsListProps) {
  return (
    <section className={`${didCardClass} flex min-h-[38rem] flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={didTitleClass}>Agentes</h3>
        <span className="text-xs text-muted">{agentsList.length} en total</span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {agentsList.map((agent) => (
          <DidAgentListItem
            key={agent.id}
            agent={agent}
            credentials={credsByAgentId.get(agent.id)}
            deleting={deletingAgentId === agent.id}
            onDelete={onDelete}
            onSelect={onSelect}
            selected={selectedAgentId === agent.id}
          />
        ))}
      </div>
    </section>
  );
}
