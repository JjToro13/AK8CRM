import {
  clientEyebrowClass,
  clientMetricCardClass,
  clientSubTextClass,
  clientTitleClass,
} from "../../../shared/components/client/clientUi";

type ClientsResultsHeaderProps = {
  startItem: number;
  endItem: number;
  isSearchActive: boolean;
  totalClients: number;
  unfilteredTotalClients: number;
  refreshing: boolean;
};

export default function ClientsResultsHeader({
  startItem,
  endItem,
  isSearchActive,
  totalClients,
  unfilteredTotalClients,
  refreshing,
}: ClientsResultsHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-3">
        <span className={clientEyebrowClass}>Lectura de cartera</span>
        <div className="space-y-1.5">
          <h2 className={clientTitleClass}>Clientes</h2>
          <p className={clientSubTextClass}>
            Busca, filtra y activa acciones sobre la cartera sin perder
            contexto operativo.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 xl:justify-end">
        <div className={clientMetricCardClass("neutral")}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Vista actual
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {totalClients.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted">
            {isSearchActive ? "resultados filtrados" : "resultados visibles"}
          </div>
        </div>

        <div className={clientMetricCardClass(isSearchActive ? "brand" : "success")}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Tramo
          </div>
          <div className="mt-2 text-lg font-semibold text-ink">
            {startItem}-{endItem}
          </div>
          <div className="mt-1 text-xs text-muted">
            {isSearchActive
              ? `base ${unfilteredTotalClients.toLocaleString()}`
              : "listado actual"}
          </div>
        </div>

        {refreshing ? (
          <span className={clientMetricCardClass("brand")}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
              Actualizando...
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
