import { AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";

type CampaignManagementErrorCardProps = {
  error: string;
};

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";

export default function CampaignManagementErrorCard({
  error,
}: CampaignManagementErrorCardProps) {
  return (
    <div className={cn(cardClass, "bg-red-50 border-red-200")}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-red-700">Error</div>
          <div className="text-sm text-red-700/90 mt-1">{error}</div>
        </div>
      </div>
    </div>
  );
}
