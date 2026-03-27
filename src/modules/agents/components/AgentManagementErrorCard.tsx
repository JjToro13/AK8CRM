import { AlertCircle } from "lucide-react";

type AgentManagementErrorCardProps = {
  error: string;
};

export default function AgentManagementErrorCard({
  error,
}: AgentManagementErrorCardProps) {
  return (
    <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <p className="text-red-700 text-sm font-semibold">{error}</p>
      </div>
    </div>
  );
}
