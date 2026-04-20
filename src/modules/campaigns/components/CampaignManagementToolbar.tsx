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
        "relative overflow-hidden border-brand/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.78)_44%,rgb(var(--color-brand-100)/0.14)_100%)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.8),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.24),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-y-7 right-[22rem] hidden w-px bg-gradient-to-b from-transparent via-brand/12 to-transparent xl:block" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-5">
          <div className={campaignEyebrowClass}>Control de campañas</div>

          <div className="space-y-3">
            <h2 className="max-w-3xl text-xl font-semibold tracking-tight text-ink sm:text-[2rem] sm:leading-[1.15]">
              Importa, ordena y opera tus bases desde una sola vista
            </h2>
            <p className={cn(campaignSubTextClass, "max-w-2xl text-[15px] leading-8")}>
              Deja la campaña más reciente o la más antigua al frente, exporta
              reportes y controla disponibilidad sin perder lectura ejecutiva.
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/76 bg-white/72 px-3 py-1.5 text-xs font-semibold text-muted shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {campaignsCount} base{campaignsCount === 1 ? "" : "s"} activas en esta operación
            </div>
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

        <div className="flex flex-wrap items-stretch justify-end gap-2 sm:gap-3 xl:max-w-[25rem]">
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
            className={cn(campaignGhostButtonClass, "min-h-[4.75rem] px-5")}
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
