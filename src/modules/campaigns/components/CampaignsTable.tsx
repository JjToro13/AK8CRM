import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import type {
  CampaignSortDirection,
  CampaignSortKey,
  CampaignViewRow,
} from "../types/campaign.types";
import CampaignsTableRow from "./CampaignsTableRow";

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
  onToggleLock: (campaign: CampaignViewRow) => void;
};

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";
const titleClass = "text-base sm:text-lg font-semibold tracking-tight text-ink";

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
    "inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition hover:text-ink";

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className={titleClass}>Campañas activas</h3>
          <p className={cn("text-sm text-muted", "mt-1")}>
            Importa listas, exporta reportes y gestiona bloqueo por campaña.
          </p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-10">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-brand" />
          </div>
          <div className="mt-3 text-sm font-semibold text-ink">
            No hay campañas
          </div>
          <div className="mt-1 text-sm text-muted">
            Aparecerán al importar listas.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface2 border-b border-border">
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

              <tbody className="divide-y divide-border">
                {campaigns.map((campaign) => (
                  <CampaignsTableRow
                    key={campaign.id}
                    campaign={campaign}
                    deletingCampaignId={deletingCampaignId}
                    togglingLockCampaignId={togglingLockCampaignId}
                    onDelete={onDelete}
                    onEditName={onEditName}
                    onExport={onExport}
                    onToggleLock={onToggleLock}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border bg-surface2 px-4 py-3 text-xs text-muted">
            Tip: puedes hacer scroll horizontal si la tabla no cabe completa.
          </div>
        </div>
      )}
    </section>
  );
}
