import type { Call } from "../../../lib/supabase";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { cn } from "../../../lib/utils";
import type { StatusFilter } from "../types/call-history.types";
import CallHistoryFilters from "./CallHistoryFilters";
import CallHistoryListItem from "./CallHistoryListItem";

type CallHistoryListProps = {
  loading: boolean;
  refreshing: boolean;
  filteredCalls: Call[];
  selectedCallId: string | null;
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelectCall: (call: Call) => void;
};

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-8";

export default function CallHistoryList({
  loading,
  refreshing,
  filteredCalls,
  selectedCallId,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelectCall,
}: CallHistoryListProps) {
  return (
    <section className={cn(cardClass, "lg:col-span-2")}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="text-sm font-semibold text-ink/80">Llamadas</div>
          <div className="text-xs text-muted mt-1">
            {filteredCalls.length.toLocaleString()} resultados
          </div>
        </div>

        {refreshing ? (
          <div className="text-xs text-muted inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand animate-pulse" />
            Actualizando...
          </div>
        ) : null}
      </div>

      <CallHistoryFilters
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={onSearchChange}
        onStatusFilterChange={onStatusFilterChange}
      />

      <div className="max-h-[62vh] overflow-y-auto pr-1 space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-border bg-surface2 p-10 flex justify-center">
            <LoadingSpinner
              size="sm"
              text="Cargando llamadas..."
              fullScreen={false}
            />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface2 p-8 text-center text-sm text-muted">
            {searchQuery || statusFilter !== "all"
              ? "No se encontraron llamadas con esos filtros."
              : "No hay llamadas registradas."}
          </div>
        ) : (
          filteredCalls.map((call) => (
            <CallHistoryListItem
              key={call.id}
              call={call}
              active={selectedCallId === call.id}
              onSelect={onSelectCall}
            />
          ))
        )}
      </div>
    </section>
  );
}
