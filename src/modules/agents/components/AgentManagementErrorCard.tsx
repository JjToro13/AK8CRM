import { AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { agentCardClass } from "./agentUi";

type AgentManagementErrorCardProps = {
  error: string;
};

export default function AgentManagementErrorCard({
  error,
}: AgentManagementErrorCardProps) {
  return (
    <div
      className={cn(
        agentCardClass,
        "border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.82))]",
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <p className="text-red-700 text-sm font-semibold">{error}</p>
      </div>
    </div>
  );
}
