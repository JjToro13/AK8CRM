import { Download, RefreshCw, Upload } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { cn } from "../../../lib/utils";
import type { CampaignTotals } from "../types/campaign.types";
import {
  campaignCardClass,
  campaignEyebrowClass,
  campaignGhostButtonClass,
  campaignMetricCardClass,
  campaignPrimaryButtonClass,
  campaignSubTextClass,
} from "./campaignUi";

type CampaignManagementToolbarProps = {
  campaignsCount: number;
  syncing: boolean;
  totals: CampaignTotals;
  onExport: () => void;
  onImport: () => void;
  onRefresh: () => void;
};

export default function CampaignManagementToolbar({
  campaignsCount,
  syncing,
  totals,
  onExport,
  onImport,
  onRefresh,
}: CampaignManagementToolbarProps) {
  return (
    <section
      className={cn(
        campaignCardClass,
        "relative overflow-hidden border-brand/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.72)_38%,rgb(var(--color-brand-100)/0.18)_100%)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.2),transparent_34%)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 space-y-4">
          <div className={campaignEyebrowClass}>
            Control de campañas
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Importa, ordena y opera tus bases desde una sola vista
            </h2>
            <p className={cn(campaignSubTextClass, "mt-2 max-w-2xl")}>
              Deja la campaña mas reciente o la mas antigua al frente, exporta
              reportes y controla disponibilidad sin perder lectura ejecutiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onImport}
              className={campaignPrimaryButtonClass}
              title="Importar nueva campaña"
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>

            <button
              type="button"
              onClick={onExport}
              className={campaignGhostButtonClass}
              title="Exportar campaña"
              disabled={campaignsCount === 0}
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className={campaignMetricCardClass("neutral")}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Total
            </div>
            <div className="mt-1 text-[1.05rem] font-semibold text-ink">
              {totals.totalClients}
            </div>
          </div>

          <div className={campaignMetricCardClass("brand")}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Asignados
            </div>
            <div className="mt-1 text-[1.05rem] font-semibold text-ink">
              {totals.totalAssigned}
            </div>
          </div>

          <div className={campaignMetricCardClass("success")}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Disponibles
            </div>
            <div className="mt-1 text-[1.05rem] font-semibold text-emerald-700">
              {totals.totalAvailable}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            className={campaignGhostButtonClass}
            title="Actualizar campañas"
          >
            {syncing ? (
              <LoadingSpinner size="sm" text="" fullScreen={false} />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Actualizar</span>
          </button>
        </div>
      </div>
    </section>
  );
}
