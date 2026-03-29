import { AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { campaignCardClass } from "./campaignUi";

type CampaignManagementErrorCardProps = {
  error: string;
};

export default function CampaignManagementErrorCard({
  error,
}: CampaignManagementErrorCardProps) {
  return (
    <div
      className={cn(
        campaignCardClass,
        "border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.82))]",
      )}
    >
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
