import { Download, RefreshCw, Upload } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { cn } from "../../../lib/utils";
import type { CampaignTotals } from "../types/campaign.types";

type CampaignManagementToolbarProps = {
  campaignsCount: number;
  syncing: boolean;
  totals: CampaignTotals;
  onExport: () => void;
  onImport: () => void;
  onRefresh: () => void;
};

const pillButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
  "shadow-[0_8px_20px_rgba(17,24,39,0.06)] hover:shadow-[0_12px_26px_rgba(17,24,39,0.09)] hover:bg-surface2 transition " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:opacity-50 disabled:cursor-not-allowed";

function summaryCardClass(tone: "neutral" | "blue" | "green") {
  return cn(
    "rounded-2xl border px-4 py-3",
    tone === "neutral" && "border-border bg-surface2",
    tone === "blue" && "border-brand/20 bg-brand/5",
    tone === "green" && "border-emerald-200 bg-emerald-50",
  );
}

export default function CampaignManagementToolbar({
  campaignsCount,
  syncing,
  totals,
  onExport,
  onImport,
  onRefresh,
}: CampaignManagementToolbarProps) {
  return (
    <section className="rounded-[1.75rem] border border-brand/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98)_34%,rgba(16,185,129,0.04)_100%)] p-6 sm:p-7 shadow-soft">
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div className="space-y-4 min-w-0">
          <div className="inline-flex items-center rounded-full border border-brand/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/80">
            Control de campañas
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Importa, ordena y opera tus bases desde una sola vista
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Deja la campaña mas reciente o la mas antigua al frente, exporta
              reportes y controla disponibilidad sin perder lectura ejecutiva.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onImport}
              className={pillButtonClass}
              title="Importar nueva campaña"
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>

            <button
              type="button"
              onClick={onExport}
              className={pillButtonClass}
              title="Exportar campaña"
              disabled={campaignsCount === 0}
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <div className={summaryCardClass("neutral")}>
            <div className="text-xs text-muted">Total</div>
            <div className="text-sm font-semibold text-ink">
              {totals.totalClients}
            </div>
          </div>

          <div className={summaryCardClass("blue")}>
            <div className="text-xs text-muted">Asignados</div>
            <div className="text-sm font-semibold text-ink">
              {totals.totalAssigned}
            </div>
          </div>

          <div className={summaryCardClass("green")}>
            <div className="text-xs text-muted">Disponibles</div>
            <div className="text-sm font-semibold text-emerald-700">
              {totals.totalAvailable}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            className={pillButtonClass}
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
