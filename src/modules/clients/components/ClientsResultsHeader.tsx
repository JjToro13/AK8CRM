import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  Columns,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import {
  clientEyebrowClass,
  clientInsetClass,
  clientMetricCardClass,
  clientSubTextClass,
  clientTitleClass,
} from "../../../shared/components/client/clientUi";
import { cn } from "../../../lib/utils";
import {
  CLIENT_TABLE_COLUMNS,
  type ClientTableColumnKey,
  type ClientTableSortDirection,
  type ClientTableSortKey,
} from "./clientTableColumns";

type ClientsResultsHeaderProps = {
  startItem: number;
  endItem: number;
  hasActiveFilters: boolean;
  hasActiveColumnFilters: boolean;
  totalClients: number;
  unfilteredTotalClients: number;
  refreshing: boolean;
  visibleColumns: ClientTableColumnKey[];
  showColumnFilters: boolean;
  sortKey: ClientTableSortKey;
  sortDirection: ClientTableSortDirection;
  onToggleColumn: (column: ClientTableColumnKey) => void;
  onToggleColumnFilters: () => void;
  onResetColumnFilters: () => void;
};

export default function ClientsResultsHeader({
  startItem,
  endItem,
  hasActiveFilters,
  hasActiveColumnFilters,
  totalClients,
  unfilteredTotalClients,
  refreshing,
  visibleColumns,
  showColumnFilters,
  sortKey,
  sortDirection,
  onToggleColumn,
  onToggleColumnFilters,
  onResetColumnFilters,
}: ClientsResultsHeaderProps) {
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const sortLabel =
    CLIENT_TABLE_COLUMNS.find((column) => column.sortKey === sortKey)?.label ??
    "Fecha creacion";
  const visibleSummary = useMemo(
    () => `${visibleColumns.length} columnas visibles`,
    [visibleColumns.length],
  );
  const sortSummary = `${sortDirection === "asc" ? "Asc" : "Desc"} - ${sortLabel}`;

  useEffect(() => {
    if (!isTrayOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;
      if (anchorRef.current?.contains(target)) return;

      setIsTrayOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isTrayOpen]);

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
        <div ref={anchorRef} className="relative">
          <button
            type="button"
            onClick={() => setIsTrayOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/78 bg-white/74 px-3 py-2 text-xs font-medium text-muted shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:border-brand/20 hover:bg-white/86 hover:text-ink"
          >
            <Columns className="h-3.5 w-3.5" />
            <span>{visibleSummary}</span>
            <span className="text-[11px] text-muted/80">{sortSummary}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isTrayOpen && "rotate-180",
              )}
            />
          </button>

          <div
            className={cn(
              "absolute right-0 top-full z-40 mt-3 w-[28rem] max-w-[calc(100vw-4rem)] rounded-[1.45rem] border border-white/84 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.8))] p-4 shadow-[0_28px_70px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-2xl transition duration-150 ease-out",
              isTrayOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Configuracion de tabla
                </div>
                <div className="mt-1 text-sm text-ink/80">
                  Elige que columnas quieres mantener visibles en la cartera.
                </div>
              </div>

              <div className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/72 px-2 py-1 text-[11px] text-muted">
                {sortDirection === "asc" ? (
                  <ArrowUpAZ className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownAZ className="h-3.5 w-3.5" />
                )}
                {sortLabel}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {CLIENT_TABLE_COLUMNS.map((column) => {
                const checked = visibleColumns.includes(column.key);

                return (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => onToggleColumn(column.key)}
                    className={cn(
                      clientInsetClass,
                      "flex items-center justify-between gap-3 p-3 text-left transition",
                      checked ? "border-brand/20 bg-brand/[0.06]" : "",
                    )}
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink/85">
                        {column.label}
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        {column.sortable
                          ? "Admite orden por cabecera"
                          : "Columna informativa"}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[2.4rem] items-center rounded-full px-1 transition",
                        checked
                          ? "justify-end bg-brand/15"
                          : "justify-start bg-slate-200/80",
                      )}
                    >
                      <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-muted">
              El orden se cambia haciendo clic sobre los encabezados de columna.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleColumnFilters}
          className="inline-flex items-center gap-2 rounded-full border border-white/78 bg-white/74 px-3 py-2 text-xs font-medium text-muted shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:border-brand/20 hover:bg-white/86 hover:text-ink"
        >
          {showColumnFilters ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showColumnFilters
            ? "Ocultar filtros de cabecera"
            : "Mostrar filtros de cabecera"}
        </button>

        <button
          type="button"
          onClick={onResetColumnFilters}
          disabled={!hasActiveColumnFilters}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-white/78 bg-white/74 px-3 py-2 text-xs font-medium text-muted shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:border-brand/20 hover:bg-white/86 hover:text-ink",
            !hasActiveColumnFilters &&
              "cursor-not-allowed opacity-50 hover:border-white/78 hover:bg-white/74 hover:text-muted",
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar filtros de cabecera
        </button>

        <div className={clientMetricCardClass("neutral")}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Vista actual
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {totalClients.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted">
            {hasActiveFilters ? "resultados filtrados" : "resultados visibles"}
          </div>
        </div>

        <div
          className={clientMetricCardClass(
            hasActiveFilters ? "brand" : "success",
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Tramo
          </div>
          <div className="mt-2 text-lg font-semibold text-ink">
            {startItem}-{endItem}
          </div>
          <div className="mt-1 text-xs text-muted">
            {hasActiveFilters
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
