import { Download, Lock, Pencil, Trash2, Unlock } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { formatCampaignDate, renderCampaignSerialRange } from "../domain/campaign-formatters";
import type { CampaignViewRow } from "../types/campaign.types";

type CampaignsTableRowProps = {
  campaign: CampaignViewRow;
  deletingCampaignId: string | null;
  togglingLockCampaignId: string | null;
  onDelete: (campaign: CampaignViewRow) => void;
  onEditName: (campaign: CampaignViewRow) => void;
  onExport: (campaignId: string) => void;
  onToggleLock: (campaign: CampaignViewRow) => void;
};

export default function CampaignsTableRow({
  campaign,
  deletingCampaignId,
  togglingLockCampaignId,
  onDelete,
  onEditName,
  onExport,
  onToggleLock,
}: CampaignsTableRowProps) {
  const isDeleting = deletingCampaignId === campaign.id;
  const isTogglingLock = togglingLockCampaignId === campaign.id;

  return (
    <tr className="hover:bg-surface2/60 transition">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-ink font-mono">
          {campaign.prefix}
        </div>
      </td>

      <td className="px-6 py-4 min-w-[220px]">
        <div className="text-sm font-semibold text-ink">{campaign.name}</div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-muted font-mono">
          {renderCampaignSerialRange(campaign.minSerial, campaign.maxSerial)}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-ink">
          {campaign.total.toLocaleString()}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-2.5 py-1 text-xs font-semibold text-ink">
          {campaign.assigned.toLocaleString()}
        </span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {campaign.available.toLocaleString()}
        </span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-muted">
          {formatCampaignDate(campaign.importedAt)}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        {campaign.isLocked ? (
          <span className="inline-flex items-center rounded-full border border-border bg-surface2 px-2.5 py-1 text-xs font-semibold text-ink/70">
            <Lock className="w-3.5 h-3.5 mr-1" />
            Bloqueada
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70">
            <Unlock className="w-3.5 h-3.5 mr-1" />
            Activa
          </span>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onExport(campaign.id)}
            className="text-emerald-700 hover:text-emerald-900 transition"
            title="Exportar esta campaña"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onEditName(campaign)}
            className="text-brand hover:opacity-90 transition"
            title="Editar nombre"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggleLock(campaign)}
            className="text-ink/70 hover:text-ink transition"
            title={campaign.isLocked ? "Desbloquear campaña" : "Bloquear campaña"}
            disabled={isTogglingLock}
          >
            {isTogglingLock ? (
              <LoadingSpinner size="sm" text="" fullScreen={false} />
            ) : campaign.isLocked ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onDelete(campaign)}
            className="text-red-600 hover:text-red-800 transition"
            title="Eliminar campaña"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <LoadingSpinner size="sm" text="" fullScreen={false} />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
