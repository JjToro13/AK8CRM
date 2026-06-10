import { Search } from "lucide-react";
import ClientSearch from "./ClientSearch";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { cn } from "../../../lib/utils";
import type { DashboardSearchPanelProps } from "../types/dashboard.types";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";
import { useBranding } from "../../../shared/branding/BrandingProvider";

function SearchMetaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="crm-shell-soft-row rounded-[1.25rem] border border-border bg-surface2 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function DashboardSearchPanel({
  degradedMode = false,
  loading,
  onCallStarted,
  onEditClient,
  onSearchChange,
  opLocked,
  searchQuery,
  searchResults,
}: DashboardSearchPanelProps) {
  const { branding } = useBranding();
  const showResults = searchQuery.trim().length >= 2 && searchResults.length > 0;
  const showEmptyState =
    searchQuery.trim().length >= 2 && searchResults.length === 0 && !loading;
  const searchDisabled = opLocked || degradedMode;

  return (
    <section className={cn(dashboardCardClass, "relative overflow-hidden")}>
      <div className="crm-dashboard-card-highlight pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.2),transparent_32%)]" />

      <div className="relative">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              Centro de busqueda
            </div>
            <h2 className={cn(dashboardTitleClass, "mt-4 text-xl sm:text-2xl")}>
              Buscar cliente
            </h2>
            <p className={cn(dashboardSubTextClass, "mt-2 max-w-xl leading-6")}>
              Punto de entrada rapido para trabajar cartera, localizar series y
              activar acciones desde {branding.productName}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[22rem]">
            <SearchMetaCard
              label="Estado"
              value={
                degradedMode
                  ? "Modo reducido"
                  : opLocked
                    ? "Operacion requerida"
                    : "Busqueda habilitada"
              }
            />
            <SearchMetaCard
              label="Entrada"
              value="Nombre o serie"
            />
          </div>
        </div>

        <div className="crm-dashboard-search-well mt-6 rounded-[1.65rem] border border-border bg-surface/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre o numero de serie..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              disabled={searchDisabled}
              className={cn(
                "crm-dashboard-search-input w-full rounded-[1.2rem] border border-border bg-white/70 px-4 py-4 pl-12 text-sm outline-none transition",
                "shadow-[0_1px_0_rgba(255,255,255,0.7)]",
                "hover:border-brand/20 focus-visible:border-brand/40 focus-visible:ring-4 focus-visible:ring-brand/15",
                searchDisabled && "cursor-not-allowed opacity-60",
              )}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {degradedMode
                ? "Busqueda temporalmente pausada para reducir carga sobre la base."
                : opLocked
                  ? "Selecciona una operacion para habilitar la busqueda."
                  : "Escribe al menos 2 caracteres para obtener resultados."}
            </span>
            <span className="font-medium text-ink/70">
              {searchQuery.trim().length > 0
                ? `Consulta: ${searchQuery.trim()}`
                : "Busqueda lista"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex justify-center">
            <LoadingSpinner size="sm" text="Buscando..." fullScreen={false} />
          </div>
        ) : null}

        {showResults ? (
          <div className="mt-5 rounded-[1.5rem] border border-border bg-surface2/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink/80">
                Resultados ({searchResults.length})
              </h3>
              <span className="text-xs text-muted">
                Acciones directas desde cada registro
              </span>
            </div>

            <div className="mt-4 space-y-3">
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
          <div className="mt-5 rounded-[1.35rem] border border-dashed border-border bg-surface2/35 px-4 py-4 text-center text-sm text-muted">
            No se encontraron clientes con ese criterio.
          </div>
        ) : null}
      </div>
    </section>
  );
}
