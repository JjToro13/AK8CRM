import { Check, Trash2, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { Agent, AgentDidCredentials } from "../../../shared/types/crm";
import { didPillDangerClass } from "./didUi";

type DidAgentListItemProps = {
  agent: Agent;
  credentials?: AgentDidCredentials | null;
  deleting: boolean;
  onDelete: (agentId: string) => void;
  onSelect: (agent: Agent) => void;
  selected: boolean;
};

export default function DidAgentListItem({
  agent,
  credentials,
  deleting,
  onDelete,
  onSelect,
  selected,
}: DidAgentListItemProps) {
  const hasCredentials = Boolean(credentials?.extension_number);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(agent);
        }
      }}
      className={cn(
        "w-full text-left rounded-2xl border px-4 py-3 transition",
        "bg-surface hover:bg-surface2",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15",
        selected ? "border-brand/30 ring-4 ring-brand/10" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink truncate">
            {agent.name}
          </div>
          <div className="text-xs text-muted truncate">{agent.email}</div>

          {hasCredentials ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
              <Check className="w-3.5 h-3.5" />
              Extension:{" "}
              <span className="font-semibold">{credentials?.extension_number}</span>
            </div>
          ) : (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
              <X className="w-3.5 h-3.5 text-red-500" />
              Sin extension
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasCredentials ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}

          {hasCredentials ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(agent.id);
              }}
              className={cn(didPillDangerClass, "px-3 py-2")}
              title="Eliminar configuracion"
              aria-label="Eliminar configuracion"
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
