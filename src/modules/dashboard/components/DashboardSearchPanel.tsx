import { Search } from "lucide-react";
import ClientSearch from "./ClientSearch";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { cn } from "../../../lib/utils";
import type { DashboardSearchPanelProps } from "../types/dashboard.types";
import { dashboardCardClass, dashboardTitleClass } from "./dashboardUi";

export default function DashboardSearchPanel({
  loading,
  onCallStarted,
  onEditClient,
  onSearchChange,
  opLocked,
  searchQuery,
  searchResults,
}: DashboardSearchPanelProps) {
  const showResults = searchQuery.trim().length >= 2 && searchResults.length > 0;
  const showEmptyState =
    searchQuery.trim().length >= 2 && searchResults.length === 0 && !loading;

  return (
    <section className={dashboardCardClass}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className={dashboardTitleClass}>Buscar Cliente</h2>
        <div className="text-xs text-muted">
          {opLocked ? "Selecciona operacion para habilitar" : "Busca por nombre o serie"}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="Buscar por nombre o numero de serie..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          disabled={opLocked}
          className={cn(
            "w-full rounded-2xl border border-border bg-surface px-4 py-3 pl-12 text-sm outline-none transition",
            "shadow-[0_1px_0_rgba(255,255,255,0.7)]",
            "hover:border-brand/20 focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand/40",
            opLocked && "opacity-60 cursor-not-allowed",
          )}
        />
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <LoadingSpinner size="sm" text="Buscando..." fullScreen={false} />
        </div>
      ) : null}

      {showResults ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink/80">
              Resultados ({searchResults.length})
            </h3>
            <span className="text-xs text-muted">Tip: escribe 2+ caracteres</span>
          </div>

          <div className="space-y-3">
            {searchResults.map((client) => (
              <ClientSearch
                key={client.id}
                client={client}
                onCallStarted={onCallStarted}
                onEditClient={onEditClient}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="mt-5 text-center text-sm text-muted">
          No se encontraron clientes con ese criterio
        </div>
      ) : null}
    </section>
  );
}
