import { Clock, RotateCcw, Trash2 } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import type { CampaignViewRow } from "../types/campaign.types";
import { formatCampaignDate } from "../domain/campaign-formatters";
import {
  campaignCardClass,
  campaignEyebrowClass,
  campaignGhostButtonClass,
  campaignSubTextClass,
  campaignTitleClass,
} from "./campaignUi";
import { cn } from "../../../lib/utils";

type PendingDeletionCampaignsPanelProps = {
  campaigns: CampaignViewRow[];
  deletingCampaignId: string | null;
  restoringCampaignId: string | null;
  onDelete: (campaign: CampaignViewRow) => void;
  onRestore: (campaign: CampaignViewRow) => void;
};

export default function PendingDeletionCampaignsPanel({
  campaigns,
  deletingCampaignId,
  restoringCampaignId,
  onDelete,
  onRestore,
}: PendingDeletionCampaignsPanelProps) {
  if (campaigns.length === 0) return null;

  return (
    <section className={cn(campaignCardClass, "border-amber-200/70")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={campaignEyebrowClass}>Retiro temporal</div>
          <h3 className={cn(campaignTitleClass, "mt-3 text-[1.35rem]")}>
            Campañas en espera de eliminacion
          </h3>
          <p className={cn(campaignSubTextClass, "mt-2")}>
            Estas bases estan ocultas y desasignadas durante el periodo de gracia.
            Puedes restaurarlas antes del borrado definitivo.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-800">
          <Clock className="h-3.5 w-3.5" />
          {campaigns.length} pendiente{campaigns.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2">
        {campaigns.map((campaign) => {
          const availableAt = campaign.deletionAvailableAt
            ? new Date(campaign.deletionAvailableAt)
            : null;
          const canDelete =
            availableAt !== null && availableAt.getTime() <= Date.now();
          const isRestoring = restoringCampaignId === campaign.id;
          const isDeleting = deletingCampaignId === campaign.id;
          const deleteLabel = canDelete ? "Borrar" : "Borrar ahora";

          return (
            <div
              key={campaign.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-white/72 bg-white/66 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">
                    {campaign.prefix}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {campaign.name}
                  </span>
                  <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {canDelete ? "Lista para borrar" : "En gracia"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {campaign.total.toLocaleString()} clientes · borrado definitivo desde{" "}
                  {formatCampaignDate(campaign.deletionAvailableAt)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRestore(campaign)}
                  disabled={isRestoring || isDeleting}
                  className={campaignGhostButtonClass}
                >
                  {isRestoring ? (
                    <LoadingSpinner size="sm" text="" fullScreen={false} />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Restaurar
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(campaign)}
                  disabled={isDeleting}
                  className={cn(
                    campaignGhostButtonClass,
                    "border-red-300/70 text-red-700 hover:border-red-400/80",
                  )}
                >
                  {isDeleting ? (
                    <LoadingSpinner size="sm" text="" fullScreen={false} />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleteLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
