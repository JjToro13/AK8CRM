import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import EditClientModal from "../../../shared/components/client/EditClientModal";
import EmailModal from "../../../shared/components/client/EmailModal";
import GeneralNoticeModal from "../../../shared/components/feedback/GeneralNoticeModal";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import ClientsFiltersCard from "../components/ClientsFiltersCard";
import ClientsPagination from "../components/ClientsPagination";
import ClientsResultsHeader from "../components/ClientsResultsHeader";
import ClientsTable from "../components/ClientsTable";
import CalendarEventModal from "../../calendar/components/CalendarEventModal";
import CalendarFollowUpModal from "../../calendar/components/CalendarFollowUpModal";
import {
  useClientManagement,
  type ClientManagementProps,
} from "../hooks/useClientManagement";

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";
const CLIENTS_UPDATES_NOTICE_KEY = "clients_updates_notice_v1";

export default function ClientManagementPage(
  props: ClientManagementProps = {},
) {
  const {
    isAdmin,
    canExecuteClientActions,
    opLocked,
    clients,
    initialLoading,
    refreshing,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    campaignFilter,
    setCampaignFilter,
    assignedAgentFilter,
    setAssignedAgentFilter,
    campaignFilterOptions,
    agentFilterOptions,
    activeFilterSummary,
    selectedClient: modalClient,
    showEditModal,
    closeEditModal,
    showEmailModal,
    closeEmailModal,
    selectedClientForEmail,
    showScheduleModal,
    showScheduleFollowUpModal,
    closeScheduleModal,
    closeScheduleFollowUpModal,
    selectedClientForSchedule,
    selectedScheduledEvent,
    scheduleDraftDate,
    scheduleAgents,
    scheduleSaving,
    error,
    callingClient,
    callNoticeOpen,
    openCallNotice,
    closeCallNotice,
    enableCalls,
    totalClients,
    unfilteredTotalClients,
    isSearchActive,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    pageInput,
    setPageInput,
    tableScrollRef,
    lastTableViewportHeightRef,
    totalPages,
    startItem,
    endItem,
    handleCopy,
    loadClients,
    handleEditClient,
    handleClientSaved,
    handleCallClient,
    handleEmailClient,
    handleScheduleClient,
    handleScheduleCreated,
    handleScheduleUpdated,
    handleScheduleDeleted,
    openScheduleEditFromFollowUp,
    handlePrevPage,
    handleNextPage,
    handlePageInputSubmit,
    updatedSecs,
    headerSubtitle,
    handleTableScroll,
    viewerAgentId,
  } = useClientManagement(props);
  const clientsWorkspaceRef = useRef<HTMLElement | null>(null);
  const [selectedActionClientId, setSelectedActionClientId] = useState<string | null>(
    null,
  );
  const [updatesNoticeOpen, setUpdatesNoticeOpen] = useState(true);

  const headerTotal = isSearchActive ? unfilteredTotalClients : totalClients;
  const selectedActionClient = useMemo(
    () => clients.find((client) => client.id === selectedActionClientId) ?? null,
    [clients, selectedActionClientId],
  );

  useEffect(() => {
    if (!clients.some((client) => client.id === selectedActionClientId)) {
      setSelectedActionClientId(null);
    }
  }, [clients, selectedActionClientId]);

  useEffect(() => {
    if (!selectedActionClientId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (!target) return;
      if (clientsWorkspaceRef.current?.contains(target)) return;

      setSelectedActionClientId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [selectedActionClientId]);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<Users className="h-5 w-5 text-brand" />}
        title="Gestión de Clientes"
        subtitle={
          <span className="text-xs text-muted hidden sm:inline">
            {headerSubtitle}
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
              onClick={() => loadClients({ silent: true })}
              className={pageHeaderActionClassName}
              disabled={refreshing || opLocked}
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
            {headerTotal.toLocaleString()} clientes
            {isSearchActive ? <> • {totalClients.toLocaleString()} filtrados</> : null}
            {" • "}actualizado hace {updatedSecs}s
          </div>
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="brand" contentClassName="space-y-6">
          {opLocked ? (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Debes seleccionar una operación para ver clientes.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            </div>
          ) : null}

          <GeneralNoticeModal
            open={updatesNoticeOpen}
            onClose={() => setUpdatesNoticeOpen(false)}
            dismissKey={CLIENTS_UPDATES_NOTICE_KEY}
            variant="info"
            title="Cambios en clientes"
            message={
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li>
                  Ahora selecciona una fila para activar los botones de acciones
                  rápidas en la parte inferior.
                </li>
                <li>
                  Los filtros se abren desde <strong>Sin filtros activos</strong>.
                </li>
                <li>
                  Un doble clic en una fila abre la edición del cliente de forma
                  rápida.
                </li>
              </ul>
            }
            primaryText="Entendido"
          />

          <GeneralNoticeModal
            open={callNoticeOpen}
            onClose={closeCallNotice}
            variant="warning"
            title="Función en revisión"
            message={
              <>
                <p className="mb-2">Esta función está en revisión.</p>
                <p className="text-sm">
                  Si tienes dudas de cómo realizar tus llamadas, comunícate con tu
                  Team Leader.
                </p>
              </>
            }
            primaryText="Entendido"
          />

          <section ref={clientsWorkspaceRef} className={cardClass}>
            <ClientsResultsHeader
              startItem={startItem}
              endItem={endItem}
              isSearchActive={isSearchActive}
              totalClients={totalClients}
              unfilteredTotalClients={unfilteredTotalClients}
              refreshing={refreshing}
            />

            <ClientsFiltersCard
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery("")}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              campaignFilter={campaignFilter}
              onCampaignFilterChange={setCampaignFilter}
              campaignOptions={campaignFilterOptions}
              assignedAgentFilter={assignedAgentFilter}
              onAssignedAgentFilterChange={setAssignedAgentFilter}
              agentOptions={agentFilterOptions}
              activeFilterSummary={activeFilterSummary}
              isAdmin={isAdmin}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              opLocked={opLocked}
            />

            <ClientsTable
              clients={clients}
              initialLoading={initialLoading}
              opLocked={opLocked}
              searchQuery={searchQuery}
              selectedClientId={selectedActionClientId}
              tableScrollRef={tableScrollRef}
              lastTableViewportHeight={lastTableViewportHeightRef.current}
              onTableScroll={handleTableScroll}
              onSelectClient={setSelectedActionClientId}
              onEditClient={handleEditClient}
              onCopy={handleCopy}
            />

            <ClientsPagination
              startItem={startItem}
              endItem={endItem}
              totalClients={totalClients}
              currentPage={currentPage}
              pageInput={pageInput}
              totalPages={totalPages}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onPageInputChange={setPageInput}
              onPageInputSubmit={handlePageInputSubmit}
              selectedClient={selectedActionClient}
              canExecuteClientActions={canExecuteClientActions}
              enableCalls={enableCalls}
              callingClient={callingClient}
              onCallClient={handleCallClient}
              onOpenCallNotice={openCallNotice}
              onEmailClient={handleEmailClient}
              onScheduleClient={handleScheduleClient}
              onEditClient={handleEditClient}
            />
          </section>
        </PageStage>
      </main>

      <AppFooter note="Vista de clientes, seguimiento comercial y cartera activa." />

      {canExecuteClientActions ? (
        <EditClientModal
          client={modalClient}
          isOpen={showEditModal}
          onClose={closeEditModal}
          onSave={handleClientSaved}
          isAdmin={isAdmin}
        />
      ) : null}

      {canExecuteClientActions && selectedClientForEmail ? (
        <EmailModal
          client={selectedClientForEmail}
          isOpen={showEmailModal}
          onClose={closeEmailModal}
        />
      ) : null}

      {canExecuteClientActions ? (
        <CalendarEventModal
          isOpen={showScheduleModal}
          onClose={closeScheduleModal}
          event={selectedScheduledEvent}
          draftDate={scheduleDraftDate}
          presetClient={selectedClientForSchedule}
          isAdmin={isAdmin}
          viewerAgentId={viewerAgentId}
          targetOperationId={selectedClientForSchedule?.operation_id ?? null}
          agentsList={scheduleAgents}
          saving={scheduleSaving}
          onCreate={handleScheduleCreated}
          onUpdate={handleScheduleUpdated}
          onDelete={handleScheduleDeleted}
        />
      ) : null}

      {canExecuteClientActions ? (
        <CalendarFollowUpModal
          isOpen={showScheduleFollowUpModal}
          event={selectedScheduledEvent}
          saving={scheduleSaving}
          onClose={closeScheduleFollowUpModal}
          onOpenEdit={openScheduleEditFromFollowUp}
          onUpdate={handleScheduleUpdated}
        />
      ) : null}

    </div>
  );
}
