import { Download, Lock, Pencil, Trash2, Unlock, Users } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import {
  formatCampaignDate,
  renderCampaignSerialRange,
} from "../domain/campaign-formatters";
import type { CampaignViewRow } from "../types/campaign.types";
import { cn } from "../../../lib/utils";

type CampaignsTableRowProps = {
  campaign: CampaignViewRow;
  deletingCampaignId: string | null;
  togglingLockCampaignId: string | null;
  onDelete: (campaign: CampaignViewRow) => void;
  onEditName: (campaign: CampaignViewRow) => void;
  onExport: (campaignId: string) => void;
  onOpenClients: (campaign: CampaignViewRow) => void;
  onToggleLock: (campaign: CampaignViewRow) => void;
};

export default function CampaignsTableRow({
  campaign,
  deletingCampaignId,
  togglingLockCampaignId,
  onDelete,
  onEditName,
  onExport,
  onOpenClients,
  onToggleLock,
}: CampaignsTableRowProps) {
  const isDeleting = deletingCampaignId === campaign.id;
  const isTogglingLock = togglingLockCampaignId === campaign.id;
  const actionButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/76 bg-white/68 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] transition hover:-translate-y-[1px] hover:border-brand/22 hover:bg-white/84 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <tr
      className="cursor-pointer transition hover:bg-white/38"
      onDoubleClick={() => onOpenClients(campaign)}
      title="Doble clic para abrir la base"
    >
      <td className="whitespace-nowrap px-6 py-4">
        <div className="inline-flex items-center rounded-full border border-brand/14 bg-brand/[0.06] px-2.5 py-1 font-mono text-sm font-semibold text-ink">
          {campaign.prefix}
        </div>
      </td>

      <td className="min-w-[220px] px-6 py-4">
        <div className="text-sm font-semibold text-ink">{campaign.name}</div>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <div className="font-mono text-sm text-muted">
          {renderCampaignSerialRange(campaign.minSerial, campaign.maxSerial)}
        </div>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <div className="text-sm font-semibold text-ink">
          {campaign.total.toLocaleString()}
        </div>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <span className="inline-flex items-center rounded-full border border-brand/18 bg-brand/[0.08] px-2.5 py-1 text-xs font-semibold text-ink">
          {campaign.assigned.toLocaleString()}
        </span>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50/90 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {campaign.available.toLocaleString()}
        </span>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <div className="text-sm text-muted">
          {formatCampaignDate(campaign.importedAt)}
        </div>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        {campaign.isLocked ? (
          <span className="inline-flex items-center rounded-full border border-amber-200/90 bg-amber-50/90 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Lock className="mr-1 h-3.5 w-3.5" />
            Bloqueada
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50/82 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <Unlock className="mr-1 h-3.5 w-3.5" />
            Activa
          </span>
        )}
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenClients(campaign);
            }}
            className={cn(actionButtonClass, "text-brand")}
            title="Ver base y mover clientes"
          >
            <Users className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onExport(campaign.id);
            }}
            className={cn(actionButtonClass, "text-emerald-700 hover:text-emerald-800")}
            title="Exportar esta campana"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEditName(campaign);
            }}
            className={cn(actionButtonClass, "text-brand")}
            title="Editar nombre"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleLock(campaign);
            }}
            className={actionButtonClass}
            title={campaign.isLocked ? "Desbloquear campana" : "Bloquear campana"}
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
            onClick={(event) => {
              event.stopPropagation();
              onDelete(campaign);
            }}
            className={cn(actionButtonClass, "text-red-600 hover:text-red-700")}
            title="Eliminar campana"
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
