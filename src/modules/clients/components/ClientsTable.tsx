import type { MutableRefObject } from "react";
import { AlertCircle, Radar } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { cn } from "../../../lib/utils";
import {
  clientInsetClass,
  clientTableShellClass,
} from "../../../shared/components/client/clientUi";
import type { Client } from "../../../shared/types/crm";
import ClientsTableRow from "./ClientsTableRow";
import {
  CLIENTS_GRID_HEADERS,
  CLIENTS_GRID_TEMPLATE,
} from "./clientsTableLayout";

type ClientsTableProps = {
  clients: Client[];
  initialLoading: boolean;
  opLocked: boolean;
  isSearchActive: boolean;
  selectedClientId: string | null;
  tableScrollRef: MutableRefObject<HTMLDivElement | null>;
  lastTableViewportHeight: number | null;
  onTableScroll: () => void;
  onSelectClient: (clientId: string) => void;
  onEditClient: (client: Client) => void;
  onCopy: (label: string, value?: string | null) => void;
};

const headerCellClass =
  "border-r border-white/55 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted";

export default function ClientsTable({
  clients,
  initialLoading,
  opLocked,
  isSearchActive,
  selectedClientId,
  tableScrollRef,
  lastTableViewportHeight,
  onTableScroll,
  onSelectClient,
  onEditClient,
  onCopy,
}: ClientsTableProps) {
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
                style={{ gridTemplateColumns: CLIENTS_GRID_TEMPLATE }}
              >
                {CLIENTS_GRID_HEADERS.map((header, index) => (
                  <div
                    key={header}
                    className={cn(
                      headerCellClass,
                      index === CLIENTS_GRID_HEADERS.length - 1 && "border-r-0",
                    )}
                  >
                    {header}
                  </div>
                ))}
              </div>
            </div>

            <div className="crm-table-body divide-y divide-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.66))]">
              {clients.map((client) => (
                <ClientsTableRow
                  key={client.id}
                  client={client}
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
