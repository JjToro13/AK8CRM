import { ArrowLeft, Phone, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import CallHistoryDetailPanel from "../components/CallHistoryDetailPanel";
import CallHistoryList from "../components/CallHistoryList";
import {
  useCallHistory,
  type UseCallHistoryProps,
} from "../hooks/useCallHistory";

export type CallHistoryPageProps = UseCallHistoryProps;

export default function CallHistoryPage({ isAdmin }: CallHistoryPageProps) {
  const {
    calls,
    error,
    filteredCalls,
    loading,
    refreshing,
    searchQuery,
    selectedCall,
    setSearchQuery,
    setSelectedCall,
    setStatusFilter,
    statusFilter,
    loadCalls,
  } = useCallHistory({ isAdmin });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<Phone className="h-5 w-5 text-brand" />}
        title="Historial de Llamadas"
        subtitle={
          <span className="text-xs text-muted hidden sm:inline">
            Filtra por cliente, serial, agente y estado
          </span>
        }
        actions={
          <>
            <Link to="/dashboard" className={pageHeaderActionClassName}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>

            <button
              type="button"
              onClick={() => loadCalls({ silent: true })}
              className={pageHeaderActionClassName}
              disabled={refreshing}
              title="Recargar"
            >
              {refreshing ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Recargar
            </button>
          </>
        }
        meta={
          <div className="text-xs text-muted">
            {calls.length.toLocaleString()} llamadas cargadas
          </div>
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="slate" containerClassName="py-10">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <CallHistoryList
              loading={loading}
              refreshing={refreshing}
              filteredCalls={filteredCalls}
              selectedCallId={selectedCall?.id ?? null}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onSearchChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              onSelectCall={setSelectedCall}
            />

            <CallHistoryDetailPanel selectedCall={selectedCall} />
          </div>
        </PageStage>
      </main>

      <AppFooter note="Historial operativo de llamadas, filtros y detalle por interaccion." />
    </div>
  );
}
