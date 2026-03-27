import { Plus, RefreshCw, Users } from "lucide-react";
import { cn } from "../../../lib/utils";

type AgentManagementHeaderProps = {
  onCreateAgent: () => void;
  onRefresh: () => void;
};

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";
const titleClass = "text-base sm:text-lg font-semibold tracking-tight text-ink";
const subTextClass = "text-sm text-muted";
const pillButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
  "shadow-[0_8px_20px_rgba(17,24,39,0.06)] hover:shadow-[0_12px_26px_rgba(17,24,39,0.09)] " +
  "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";
const pillPrimaryClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft " +
  "bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 " +
  "transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export default function AgentManagementHeader({
  onCreateAgent,
  onRefresh,
}: AgentManagementHeaderProps) {
  return (
    <div
      className={cn(
        cardClass,
        "overflow-hidden border-brand/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.09),rgba(255,255,255,0.98)_38%,rgba(37,99,235,0.03)_100%)] py-5 sm:py-6",
      )}
    >
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-[1.35rem] bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <Users className="h-5 w-5 text-brand" />
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-brand/15 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/80">
              Centro operativo
            </div>
            <h2 className={cn(titleClass, "mt-3 text-xl sm:text-2xl")}>
              Gestion de agentes con vista ejecutiva
            </h2>
            <p className={cn(subTextClass, "mt-2 max-w-2xl leading-6")}>
              Controla altas, roles y asignaciones desde una vista mas editorial,
              con mejor jerarquia visual y acciones rapidas a mano.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            onClick={onRefresh}
            className={pillButtonClass}
            title="Recargar agentes"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </button>

          <button
            type="button"
            onClick={onCreateAgent}
            className={pillPrimaryClass}
            title="Crear un nuevo agente"
          >
            <Plus className="w-4 h-4" />
            Nuevo agente
          </button>
        </div>
      </div>
    </div>
  );
}
