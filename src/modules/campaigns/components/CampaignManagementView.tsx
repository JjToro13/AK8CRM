import { Users } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import CampaignReportExporter from "./CampaignReportExporter";
import EditCampaignNameModal from "./EditCampaignNameModal";
import ImportClientsModal from "./ImportClientsModal";
import { cn } from "../../../lib/utils";
import {
  useCampaignManagement,
} from "../hooks/useCampaignManagement";
import type { CampaignManagementProps } from "../types/campaign.types";
import CampaignManagementErrorCard from "./CampaignManagementErrorCard";
import CampaignManagementNote from "./CampaignManagementNote";
import CampaignManagementToolbar from "./CampaignManagementToolbar";
import CampaignsTable from "./CampaignsTable";

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";
const titleClass = "text-base sm:text-lg font-semibold tracking-tight text-ink";
const subTextClass = "text-sm text-muted";

export default function CampaignManagementView(
  props: CampaignManagementProps,
) {
  const {
    campaignRows,
    deletingCampaignId,
    editCampaignId,
    editName,
    editOpen,
    editPrefix,
    error,
    exportOpen,
    exportOptions,
    exportCampaignId,
    isAdmin,
    loading,
    savingName,
    selectedOperationId,
    showImportModal,
    syncing,
    sortDirection,
    sortKey,
    togglingLockCampaignId,
    totals,
    openEditName,
    openExport,
    saveName,
    setEditName,
    setEditOpen,
    setExportOpen,
    setShowImportModal,
    syncNow,
    handleSortChange,
    handleDeleteCampaign,
    handleImportSuccess,
    handleToggleLock,
  } = useCampaignManagement(props);

  if (!isAdmin) {
    return (
      <div className={cn(cardClass, "bg-surface2")}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand" />
          </div>
          <div>
            <div className={titleClass}>Gestion de Campañas</div>
            <div className={subTextClass}>Disponible solo para administradores.</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner
            size="lg"
            text="Cargando campañas..."
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CampaignManagementToolbar
        campaignsCount={campaignRows.length}
        syncing={syncing}
        totals={totals}
        onExport={() => openExport()}
        onImport={() => setShowImportModal(true)}
        onRefresh={syncNow}
      />

      {error ? <CampaignManagementErrorCard error={error} /> : null}

      <CampaignsTable
        campaigns={campaignRows}
        deletingCampaignId={deletingCampaignId}
        onSortChange={handleSortChange}
        togglingLockCampaignId={togglingLockCampaignId}
        sortDirection={sortDirection}
        sortKey={sortKey}
        onDelete={handleDeleteCampaign}
        onEditName={openEditName}
        onExport={openExport}
        onToggleLock={handleToggleLock}
      />

      <CampaignManagementNote />

      <EditCampaignNameModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editCampaignId={editCampaignId}
        editPrefix={editPrefix}
        editName={editName}
        setEditName={setEditName}
        savingName={savingName}
        onSave={saveName}
      />

      <CampaignReportExporter
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        campaigns={exportOptions}
        defaultCampaignId={exportCampaignId}
        selectedOperationId={selectedOperationId}
      />

      <ImportClientsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSuccess}
        selectedOperationId={selectedOperationId}
      />
    </div>
  );
}
