import type { MutableRefObject } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Radar, X } from "lucide-react";
import { CLIENT_STATUS_OPTIONS, type ClientStatusCode, cn } from "../../../lib/utils";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import Input from "../../../shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import {
  clientInsetClass,
  clientTableShellClass,
} from "../../../shared/components/client/clientUi";
import type { Client } from "../../../shared/types/crm";
import ClientsTableRow from "./ClientsTableRow";
import {
  buildClientsGridTemplate,
  CLIENT_TABLE_COLUMNS,
  type ClientTableColumnKey,
  type ClientTableSortDirection,
  type ClientTableSortKey,
  type ClientTableTextFilterKey,
  type ClientTableTextFilters,
} from "./clientTableColumns";

type ClientsTableProps = {
  clients: Client[];
  initialLoading: boolean;
  opLocked: boolean;
  isSearchActive: boolean;
  visibleColumns: ClientTableColumnKey[];
  tableTextFilters: ClientTableTextFilters;
  showColumnFilters: boolean;
  statusFilter: "all" | ClientStatusCode;
  countryFilter: string;
  sortKey: ClientTableSortKey;
  sortDirection: ClientTableSortDirection;
  selectedClientId: string | null;
  tableScrollRef: MutableRefObject<HTMLDivElement | null>;
  lastTableViewportHeight: number | null;
  onTableScroll: () => void;
  onSelectClient: (clientId: string) => void;
  onEditClient: (client: Client) => void;
  onCopy: (label: string, value?: string | null) => void;
  onStatusFilterChange: (value: "all" | ClientStatusCode) => void;
  onCountryFilterChange: (value: string) => void;
  onTableTextFilterChange: (
    filterKey: ClientTableTextFilterKey,
    value: string,
  ) => void;
  onSortChange: (sortKey: ClientTableSortKey) => void;
};

const headerCellClass =
  "border-r border-white/55 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted";
const headerInputClass =
  "h-9 rounded-2xl border-slate-200/70 bg-white/80 px-3 py-2 text-[12px] font-medium normal-case tracking-normal text-ink shadow-none";
const clearFilterButtonClass =
  "inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/75 bg-white/88 text-muted shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition hover:border-brand/20 hover:text-ink";

export default function ClientsTable({
  clients,
  initialLoading,
  opLocked,
  isSearchActive,
  visibleColumns,
  tableTextFilters,
  showColumnFilters,
  statusFilter,
  countryFilter,
  sortKey,
  sortDirection,
  selectedClientId,
  tableScrollRef,
  lastTableViewportHeight,
  onTableScroll,
  onSelectClient,
  onEditClient,
  onCopy,
  onStatusFilterChange,
  onCountryFilterChange,
  onTableTextFilterChange,
  onSortChange,
}: ClientsTableProps) {
  const visibleColumnConfigs = CLIENT_TABLE_COLUMNS.filter((column) =>
    visibleColumns.includes(column.key),
  );
  const gridTemplate = buildClientsGridTemplate(visibleColumns);

  return (
    <div className={clientTableShellClass}>
      <div
        ref={tableScrollRef}
        onScroll={onTableScroll}
        className="crm-scrollbar crm-scrollbar-shell max-h-[70vh] overflow-auto"
      >
        {initialLoading ? (
          <div
            className="flex items-center justify-center py-14"
            style={{ minHeight: lastTableViewportHeight ?? undefined }}
          >
            <LoadingSpinner
              text="Cargando clientes..."
              size="sm"
              fullScreen={false}
            />
          </div>
        ) : opLocked ? (
          <div className="flex min-h-[22rem] items-center justify-center px-6 py-12 text-center">
            <div className="max-w-md">
              <div className={cn(clientInsetClass, "mx-auto flex h-14 w-14 items-center justify-center text-brand")}>
                <Radar className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">
                La cartera esta en espera
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Selecciona una operacion para activar la vista y cargar clientes.
              </p>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex min-h-[22rem] items-center justify-center px-6 py-12 text-center">
            <div className="max-w-md">
              <div className={cn(clientInsetClass, "mx-auto flex h-14 w-14 items-center justify-center text-ink/60")}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">
                No hay resultados en esta vista
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {isSearchActive
                  ? "Ajusta la busqueda o los filtros para encontrar otra cartera."
                  : "Todavia no hay clientes cargados para esta operacion."}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-max">
            <div className="crm-table-header sticky top-0 z-30 border-b border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.82))] backdrop-blur-xl">
              <div
                className="grid flex-none"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {visibleColumnConfigs.map((column, index) => (
                  <div
                    key={column.key}
                    className={cn(
                      headerCellClass,
                      index === visibleColumnConfigs.length - 1 && "border-r-0",
                    )}
                  >
                    <div>
                      {column.sortable && column.sortKey ? (
                        <button
                          type="button"
                          onClick={() => onSortChange(column.sortKey!)}
                          className="inline-flex items-center gap-1 transition hover:text-ink"
                        >
                          <span>{column.label}</span>
                          {sortKey === column.sortKey ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : null}
                        </button>
                      ) : (
                        <span>{column.label}</span>
                      )}

                      {showColumnFilters && column.usesStatusFilter ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                              onStatusFilterChange(
                                value as "all" | ClientStatusCode,
                              )
                            }
                            disabled={opLocked}
                          >
                            <SelectTrigger className={cn(headerInputClass, "min-h-0 flex-1")}>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent className="clients-filter-select-content">
                              <SelectItem value="all">Todos</SelectItem>
                              {CLIENT_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.code} value={option.code}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {statusFilter !== "all" ? (
                            <button
                              type="button"
                              onClick={() => onStatusFilterChange("all")}
                              className={clearFilterButtonClass}
                              title="Quitar filtro de estado"
                              aria-label="Quitar filtro de estado"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {showColumnFilters && column.usesCountryFilter ? (
                        <Input
                          type="text"
                          value={countryFilter}
                          onChange={(event) =>
                            onCountryFilterChange(event.target.value)
                          }
                          disabled={opLocked}
                          placeholder={column.filterPlaceholder ?? "Ej. Mexico"}
                          className={headerInputClass}
                          rightSlot={
                            countryFilter.trim().length > 0 ? (
                              <button
                                type="button"
                                onClick={() => onCountryFilterChange("")}
                                className={clearFilterButtonClass}
                                title="Quitar filtro de pais"
                                aria-label="Quitar filtro de pais"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null
                          }
                          containerClassName="mt-2"
                        />
                      ) : null}

                      {showColumnFilters && column.textFilterKey ? (
                        <Input
                          type="text"
                          value={tableTextFilters[column.textFilterKey]}
                          onChange={(event) =>
                            onTableTextFilterChange(
                              column.textFilterKey!,
                              event.target.value,
                            )
                          }
                          disabled={opLocked}
                          placeholder={
                            column.filterPlaceholder ??
                            `Filtrar ${column.label.toLowerCase()}...`
                          }
                          className={headerInputClass}
                          rightSlot={
                            tableTextFilters[column.textFilterKey].trim().length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onTableTextFilterChange(column.textFilterKey!, "")
                                }
                                className={clearFilterButtonClass}
                                title={`Quitar filtro de ${column.label.toLowerCase()}`}
                                aria-label={`Quitar filtro de ${column.label.toLowerCase()}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null
                          }
                          containerClassName="mt-2"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="crm-table-body divide-y divide-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.66))]">
              {clients.map((client) => (
                <ClientsTableRow
                  key={client.id}
                  client={client}
                  visibleColumns={visibleColumns}
                  gridTemplate={gridTemplate}
                  selected={client.id === selectedClientId}
                  onSelect={() => onSelectClient(client.id)}
                  onOpenEdit={onEditClient}
                  onCopy={onCopy}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
