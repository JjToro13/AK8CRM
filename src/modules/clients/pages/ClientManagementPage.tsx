import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { AlertCircle, ArrowLeft, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import EditClientModal from "../../../shared/components/client/EditClientModal";
import ClientAssignmentModal from "../../../shared/components/client/ClientAssignmentModal";
import EmailModal from "../../../shared/components/client/EmailModal";
import GeneralNoticeModal from "../../../shared/components/feedback/GeneralNoticeModal";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import {
  clientCardClass,
  clientInsetClass,
} from "../../../shared/components/client/clientUi";
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

const CLIENTS_UPDATES_NOTICE_KEY = "clients_updates_notice_v2";

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
    countryFilter,
    setCountryFilter,
    balanceRangeFilter,
    setBalanceRangeFilter,
    dailyManagementFilter,
    setDailyManagementFilter,
    visibleColumns,
    tableTextFilters,
    showColumnFilters,
    sortKey,
    sortDirection,
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
    showAssignmentModal,
    closeScheduleModal,
    closeScheduleFollowUpModal,
    closeAssignmentModal,
    selectedClientForSchedule,
    selectedScheduledEvent,
    selectedClientForAssignment,
    selectedClientsForAssignment,
    scheduleDraftDate,
    scheduleAgents,
    assignmentAgents,
    scheduleSaving,
    assignmentSaving,
    selectingFilteredClients,
    error,
    degradedMode,
    callingClient,
    callNoticeOpen,
    openCallNotice,
    closeCallNotice,
    enableCalls,
    totalClients,
    unfilteredTotalClients,
    isSearchActive,
    isSearchPendingMinLength,
    hasActiveFilters,
    hasActiveColumnFilters,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    pageInput,
    setPageInput,
    resetColumnFilters,
    toggleColumnFiltersVisibility,
    resetTableTextFilters,
    handleTableTextFilterChange,
    handleToggleColumn,
    handleSortChange,
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
    handleAssignClient,
    handleAssignFilteredClients,
    handleScheduleClient,
    handleAssignmentSaved,
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
    searchMinLength,
  } = useClientManagement(props);
  const clientsWorkspaceRef = useRef<HTMLElement | null>(null);
  const [selectedActionClientIds, setSelectedActionClientIds] = useState<string[]>(
    [],
  );
  const selectionAnchorClientIdRef = useRef<string | null>(null);
  const [updatesNoticeOpen, setUpdatesNoticeOpen] = useState(true);

  const headerTotal = hasActiveFilters ? unfilteredTotalClients : totalClients;
  const selectedActionClients = useMemo(
    () =>
      selectedActionClientIds
        .map((id) => clients.find((client) => client.id === id))
        .filter(Boolean) as typeof clients,
    [clients, selectedActionClientIds],
  );
  const selectedActionClient = selectedActionClients[0] ?? null;
  const modalClientIndex = useMemo(
    () => clients.findIndex((client) => client.id === modalClient?.id),
    [clients, modalClient?.id],
  );
  const previousModalClient =
    modalClientIndex > 0 ? clients[modalClientIndex - 1] : null;
  const nextModalClient =
    modalClientIndex >= 0 && modalClientIndex < clients.length - 1
      ? clients[modalClientIndex + 1]
      : null;

  const handleOpenPreviousClient = () => {
    if (!previousModalClient) return;
    setSelectedActionClientIds([previousModalClient.id]);
    selectionAnchorClientIdRef.current = previousModalClient.id;
    handleEditClient(previousModalClient);
  };

  const handleOpenNextClient = () => {
    if (!nextModalClient) return;
    setSelectedActionClientIds([nextModalClient.id]);
    selectionAnchorClientIdRef.current = nextModalClient.id;
    handleEditClient(nextModalClient);
  };

  useEffect(() => {
    setSelectedActionClientIds((current) => {
      const visibleIds = new Set(clients.map((client) => client.id));
      return current.filter((id) => visibleIds.has(id));
    });

    if (
      selectionAnchorClientIdRef.current &&
      !clients.some((client) => client.id === selectionAnchorClientIdRef.current)
    ) {
      selectionAnchorClientIdRef.current = null;
    }
  }, [clients]);

  useEffect(() => {
    if (selectedActionClientIds.length === 0) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (!target) return;
      if (clientsWorkspaceRef.current?.contains(target)) return;

      setSelectedActionClientIds([]);
      selectionAnchorClientIdRef.current = null;
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [selectedActionClientIds.length]);

  const handleSelectActionClient = (
    clientId: string,
    event: ReactMouseEvent | ReactKeyboardEvent,
  ) => {
    setSelectedActionClientIds((current) => {
      if (event.shiftKey && selectionAnchorClientIdRef.current) {
        const anchorIndex = clients.findIndex(
          (client) => client.id === selectionAnchorClientIdRef.current,
        );
        const targetIndex = clients.findIndex((client) => client.id === clientId);

        if (anchorIndex >= 0 && targetIndex >= 0) {
          const [from, to] =
            anchorIndex <= targetIndex
              ? [anchorIndex, targetIndex]
              : [targetIndex, anchorIndex];
          const rangeIds = clients.slice(from, to + 1).map((client) => client.id);
          return Array.from(new Set([...current, ...rangeIds]));
        }
      }

      selectionAnchorClientIdRef.current = clientId;
      return current.length === 1 && current[0] === clientId ? [] : [clientId];
    });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<Users className="h-5 w-5 text-brand" />}
        title="Gestion de Clientes"
        subtitle={
          <span className="hidden text-xs text-muted sm:inline">
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
              disabled={refreshing || opLocked || degradedMode}
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
            {hasActiveFilters ? (
              <>
                {" - "}
                {totalClients.toLocaleString()} filtrados
              </>
            ) : null}
            {" - "}actualizado hace {updatedSecs}s
          </div>
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="brand" contentClassName="space-y-6">
          {opLocked ? (
            <div
              className={`${clientInsetClass} border-amber-200/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.76),rgba(255,255,255,0.6))] p-4 text-sm text-amber-900`}
            >
              Debes seleccionar una operacion para ver clientes.
            </div>
          ) : null}

          {error ? (
            <div
              className={`${clientInsetClass} border-red-200/90 bg-[linear-gradient(180deg,rgba(254,226,226,0.8),rgba(255,255,255,0.62))] p-4`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            </div>
          ) : null}

          {degradedMode ? (
            <div
              className={`${clientInsetClass} border-amber-200/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.78),rgba(255,255,255,0.62))] p-4`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-700" />
                <p className="text-sm font-semibold text-amber-900">
                  Modo reducido activo. Se pausaron lecturas pesadas de cartera,
                  busqueda y recargas para mantener el CRM accesible.
                </p>
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
                  Puedes seleccionar una fila para activar acciones rapidas o usar
                  Shift + clic para seleccionar varios clientes visibles.
                </li>
                <li>
                  La columna Comentarios y el resto de encabezados con indicador
                  permiten ordenar la tabla.
                </li>
                {isAdmin ? (
                  <>
                    <li>
                      Desde los filtros puedes seleccionar todos los resultados
                      filtrados y aplicar acciones de base, agente o ambas.
                    </li>
                    <li>
                      En la ficha del cliente puedes editar nombre, telefono,
                      email y balance principal.
                    </li>
                  </>
                ) : null}
              </ul>
            }
            primaryText="Entendido"
          />

          <GeneralNoticeModal
            open={callNoticeOpen}
            onClose={closeCallNotice}
            variant="warning"
            title="Funcion en revision"
            message={
              <>
                <p className="mb-2">Esta funcion esta en revision.</p>
                <p className="text-sm">
                  Si tienes dudas de como realizar tus llamadas, comunicate con tu
                  Team Leader.
                </p>
              </>
            }
            primaryText="Entendido"
          />

          <section ref={clientsWorkspaceRef} className={clientCardClass}>
            <ClientsResultsHeader
              startItem={startItem}
              endItem={endItem}
              hasActiveFilters={hasActiveFilters}
              hasActiveColumnFilters={hasActiveColumnFilters}
              totalClients={totalClients}
              unfilteredTotalClients={unfilteredTotalClients}
              refreshing={refreshing}
              visibleColumns={visibleColumns}
              showColumnFilters={showColumnFilters}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleColumn={handleToggleColumn}
              onToggleColumnFilters={toggleColumnFiltersVisibility}
              onResetColumnFilters={resetColumnFilters}
            />

            <ClientsFiltersCard
              searchQuery={searchQuery}
              isSearchPendingMinLength={isSearchPendingMinLength}
              searchMinLength={searchMinLength}
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
              countryFilter={countryFilter}
              onCountryFilterChange={setCountryFilter}
              balanceRangeFilter={balanceRangeFilter}
              onBalanceRangeFilterChange={setBalanceRangeFilter}
              dailyManagementFilter={dailyManagementFilter}
              onDailyManagementFilterChange={setDailyManagementFilter}
              onResetTableTextFilters={resetTableTextFilters}
              activeFilterSummary={activeFilterSummary}
              isAdmin={isAdmin}
              totalClients={totalClients}
              selectingFilteredClients={selectingFilteredClients}
              onAssignFilteredClients={handleAssignFilteredClients}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              opLocked={opLocked}
            />

            <ClientsTable
              clients={clients}
              initialLoading={initialLoading}
              opLocked={opLocked}
              isSearchActive={isSearchActive}
              visibleColumns={visibleColumns}
              tableTextFilters={tableTextFilters}
              showColumnFilters={showColumnFilters}
              statusFilter={statusFilter}
              countryFilter={countryFilter}
              sortKey={sortKey}
              sortDirection={sortDirection}
              selectedClientIds={selectedActionClientIds}
              tableScrollRef={tableScrollRef}
              lastTableViewportHeight={lastTableViewportHeightRef.current}
              onTableScroll={handleTableScroll}
              onSelectClient={handleSelectActionClient}
              onEditClient={handleEditClient}
              onCopy={handleCopy}
              onStatusFilterChange={setStatusFilter}
              onCountryFilterChange={setCountryFilter}
              onTableTextFilterChange={handleTableTextFilterChange}
              onSortChange={handleSortChange}
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
              selectedClients={selectedActionClients}
              canExecuteClientActions={canExecuteClientActions}
              enableCalls={enableCalls}
              callingClient={callingClient}
              onCallClient={handleCallClient}
              onOpenCallNotice={openCallNotice}
              onEmailClient={handleEmailClient}
              onScheduleClient={handleScheduleClient}
              onEditClient={handleEditClient}
              canAssignClient={isAdmin}
              onAssignClient={handleAssignClient}
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
          canExecuteQuickActions={canExecuteClientActions}
          enableCalls={enableCalls}
          callingClientId={callingClient}
          onCallClient={handleCallClient}
          onOpenCallNotice={openCallNotice}
          onEmailClient={handleEmailClient}
          onScheduleClient={handleScheduleClient}
          canAssignClient={isAdmin}
          onAssignClient={handleAssignClient}
          hasPreviousClient={Boolean(previousModalClient)}
          hasNextClient={Boolean(nextModalClient)}
          onPrevClient={handleOpenPreviousClient}
          onNextClient={handleOpenNextClient}
        />
      ) : null}

      {isAdmin ? (
        <ClientAssignmentModal
          client={selectedClientForAssignment}
          clients={selectedClientsForAssignment}
          isOpen={showAssignmentModal}
          onClose={closeAssignmentModal}
          onSave={(agentId) =>
            handleAssignmentSaved({
              agentId,
              keepAssignmentOnCampaignChange: true,
            })
          }
          onSaveDetails={handleAssignmentSaved}
          saving={assignmentSaving}
          agents={assignmentAgents}
          campaignOptions={campaignFilterOptions}
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
