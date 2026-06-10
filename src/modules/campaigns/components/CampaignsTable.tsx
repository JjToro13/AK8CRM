import { ArrowDown, ArrowUp, ArrowUpDown, Sparkles, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import type {
  CampaignSortDirection,
  CampaignSortKey,
  CampaignViewRow,
} from "../types/campaign.types";
import CampaignsTableRow from "./CampaignsTableRow";
import {
  campaignCardClass,
  campaignEyebrowClass,
  campaignInsetClass,
  campaignSubTextClass,
  campaignTitleClass,
} from "./campaignUi";

type CampaignsTableProps = {
  campaigns: CampaignViewRow[];
  deletingCampaignId: string | null;
  onSortChange: (sortKey: CampaignSortKey) => void;
  togglingLockCampaignId: string | null;
  sortDirection: CampaignSortDirection;
  sortKey: CampaignSortKey;
  onDelete: (campaign: CampaignViewRow) => void;
  onEditName: (campaign: CampaignViewRow) => void;
  onExport: (campaignId: string) => void;
  onQuickAppend: (campaign: CampaignViewRow) => void;
  onOpenClients: (campaign: CampaignViewRow) => void;
  onToggleLock: (campaign: CampaignViewRow) => void;
};

export default function CampaignsTable({
  campaigns,
  deletingCampaignId,
  onSortChange,
  togglingLockCampaignId,
  sortDirection,
  sortKey,
  onDelete,
  onEditName,
  onExport,
  onQuickAppend,
  onOpenClients,
  onToggleLock,
}: CampaignsTableProps) {
  const renderSortIcon = (column: CampaignSortKey) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-brand" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-brand" />
    );
  };

  const headerButtonClass =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition hover:bg-white/58 hover:text-ink";

  return (
    <section className={campaignCardClass}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className={campaignEyebrowClass}>Vista activa</div>
          <div>
            <h3 className={cn(campaignTitleClass, "mt-4 text-[1.6rem] leading-tight")}>
              Campañas activas
            </h3>
            <p className={cn(campaignSubTextClass, "mt-2 max-w-2xl text-[15px] leading-7")}>
              Importa listas, exporta reportes, revisa clientes y gestiona bloqueo
              por campaña.
            </p>
          </div>
        </div>

        {campaigns.length > 0 ? (
          <div className="hidden items-center gap-2 rounded-full border border-white/76 bg-white/72 px-3 py-2 text-xs font-semibold text-muted shadow-[0_12px_28px_rgba(15,23,42,0.05)] lg:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Doble clic para abrir una base
          </div>
        ) : null}
      </div>

      {campaigns.length === 0 ? (
        <div className={cn(campaignInsetClass, "py-14 text-center")}>
          <div className="crm-shell-pill mx-auto flex h-16 w-16 items-center justify-center rounded-[1.45rem] border border-white/78 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Users className="h-7 w-7 text-brand" />
          </div>
          <div className="mt-4 text-sm font-semibold text-ink">No hay campañas todavía</div>
          <div className="mt-1 text-sm text-muted">
            Aparecerán aquí en cuanto importes la primera base.
          </div>
        </div>
      ) : (
        <div className={cn(campaignInsetClass, "overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="crm-table-header border-b border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))]">
                <tr className="text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("prefix")}
                    >
                      Prefijo
                      {renderSortIcon("prefix")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("name")}
                    >
                      Nombre
                      {renderSortIcon("name")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">Serial (rango)</th>
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("total")}
                    >
                      Total
                      {renderSortIcon("total")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("assigned")}
                    >
                      Asignados
                      {renderSortIcon("assigned")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("available")}
                    >
                      Disponibles
                      {renderSortIcon("available")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("importedAt")}
                    >
                      Importación
                      {renderSortIcon("importedAt")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("isLocked")}
                    >
                      Estado
                      {renderSortIcon("isLocked")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody className="crm-table-body divide-y divide-white/60">
                {campaigns.map((campaign) => (
                  <CampaignsTableRow
                    key={campaign.id}
                    campaign={campaign}
                    deletingCampaignId={deletingCampaignId}
                    togglingLockCampaignId={togglingLockCampaignId}
                    onDelete={onDelete}
                    onEditName={onEditName}
                    onExport={onExport}
                    onQuickAppend={onQuickAppend}
                    onOpenClients={onOpenClients}
                    onToggleLock={onToggleLock}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="crm-table-footer flex items-center gap-2 border-t border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.38))] px-4 py-3 text-xs text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand/70" />
            Tip: haz doble clic en una campaña para abrir su base y mover clientes.
          </div>
        </div>
      )}
    </section>
  );
}
