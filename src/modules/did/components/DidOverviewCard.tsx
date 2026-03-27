import { Info, Wrench } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { didPillButtonClass } from "./didUi";

type DidOverviewCardProps = {
  agentsCount: number;
  availableExtensions: readonly string[];
  configuredCount: number;
  disableRefresh?: boolean;
  maskedToken: string;
  onRefresh: () => void;
  pendingCount: number;
  refreshing: boolean;
};

export default function DidOverviewCard({
  agentsCount,
  availableExtensions,
  configuredCount,
  disableRefresh,
  maskedToken,
  onRefresh,
  pendingCount,
  refreshing,
}: DidOverviewCardProps) {
  return (
    <div className="rounded-[1.9rem] border border-[#183B8C]/20 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_28%),linear-gradient(135deg,#0d1c4b_0%,#11255f_58%,#17326f_100%)] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mt-0.5 shrink-0">
            <Info className="w-5 h-5 text-sky-200" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/90">
              Consola Did-glo-bal
            </div>
            <div className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight">
              Configuracion operativa con lectura mas clara
            </div>

            <p className="text-sm text-slate-200/90 mt-2 max-w-2xl leading-6">
              Mantiene extensiones, token y webhook visibles en una sola banda
              de control. El sistema sigue usando automaticamente el Access Token
              global del admin.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="font-semibold text-slate-100/95">
                  Agentes
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {agentsCount}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="font-semibold text-slate-100/95">
                  Configurados
                </div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">
                  {configuredCount}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="font-semibold text-slate-100/95">
                  Pendientes
                </div>
                <div className="mt-1 text-lg font-semibold text-amber-300">
                  {pendingCount}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="font-semibold text-slate-100/95">
                  Extensiones disponibles
                </div>
                <div className="text-slate-200/85 mt-1">
                  {availableExtensions.join(", ")}
                </div>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200/90">
              Token global activo: <span className="ml-2 font-mono text-slate-100">{maskedToken}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className={`${didPillButtonClass} border-white/10 bg-white text-slate-900 hover:bg-slate-100`}
          disabled={disableRefresh || refreshing}
          title="Recargar datos"
        >
          {refreshing ? (
            <LoadingSpinner size="sm" text="" fullScreen={false} />
          ) : (
            <>
              <Wrench className="w-4 h-4" />
              Recargar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
