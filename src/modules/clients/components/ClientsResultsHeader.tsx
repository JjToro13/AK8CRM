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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm font-semibold text-ink/80">Clientes</div>

      <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-muted">
        <div>
          Mostrando {startItem}-{endItem} de {totalClients.toLocaleString()}{" "}
          {isSearchActive ? "resultados filtrados" : "resultados"}
          {isSearchActive ? (
            <> - base completa: {unfilteredTotalClients.toLocaleString()}</>
          ) : null}
        </div>

        {refreshing ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-brand animate-pulse" />
            Actualizando...
          </span>
        ) : null}
      </div>
    </div>
  );
}
