import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className={campaignEyebrowClass}>Vista activa</div>
          <h3 className={cn(campaignTitleClass, "mt-4")}>Campanas activas</h3>
          <p className={cn(campaignSubTextClass, "mt-1")}>
            Importa listas, exporta reportes, revisa clientes y gestiona bloqueo por campana.
          </p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className={cn(campaignInsetClass, "py-12 text-center")}>
          <div className="crm-shell-pill mx-auto flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/78 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Users className="h-6 w-6 text-brand" />
          </div>
          <div className="mt-3 text-sm font-semibold text-ink">No hay campanas</div>
          <div className="mt-1 text-sm text-muted">
            Apareceran al importar listas.
          </div>
        </div>
      ) : (
        <div className={cn(campaignInsetClass, "overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="crm-table-header border-b border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,255,255,0.46))]">
                <tr className="text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("prefix")}
                    >
                      Prefijo
                      {renderSortIcon("prefix")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("name")}
                    >
                      Nombre
                      {renderSortIcon("name")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">Serial (rango)</th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("total")}
                    >
                      Total
                      {renderSortIcon("total")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("assigned")}
                    >
                      Asignados
                      {renderSortIcon("assigned")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("available")}
                    >
                      Disponibles
                      {renderSortIcon("available")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("importedAt")}
                    >
                      Importacion
                      {renderSortIcon("importedAt")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => onSortChange("isLocked")}
                    >
                      Estado
                      {renderSortIcon("isLocked")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">Acciones</th>
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
                    onOpenClients={onOpenClients}
                    onToggleLock={onToggleLock}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="crm-table-footer border-t border-white/72 bg-white/42 px-4 py-3 text-xs text-muted">
            Tip: puedes hacer doble clic en una campana para abrir su base y mover clientes.
          </div>
        </div>
      )}
    </section>
  );
}
