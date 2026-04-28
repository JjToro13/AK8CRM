import { Users } from "lucide-react";
import { useState } from "react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import GeneralNoticeModal from "../../../shared/components/feedback/GeneralNoticeModal";
import CampaignReportExporter from "./CampaignReportExporter";
import EditCampaignNameModal from "./EditCampaignNameModal";
import DeleteCampaignConfirmModal from "./DeleteCampaignConfirmModal";
import ImportClientsModal from "./ImportClientsModal";
import CampaignClientsModal from "./CampaignClientsModal";
import { cn } from "../../../lib/utils";
import {
  useCampaignManagement,
} from "../hooks/useCampaignManagement";
import type { CampaignManagementProps } from "../types/campaign.types";
import CampaignManagementErrorCard from "./CampaignManagementErrorCard";
import CampaignManagementNote from "./CampaignManagementNote";
import CampaignManagementToolbar from "./CampaignManagementToolbar";
import CampaignsTable from "./CampaignsTable";
import PendingDeletionCampaignsPanel from "./PendingDeletionCampaignsPanel";
import {
  campaignCardClass,
  campaignEyebrowClass,
  campaignSubTextClass,
  campaignTitleClass,
} from "./campaignUi";

const CAMPAIGNS_ADMIN_UPDATES_NOTICE_KEY = "campaigns_admin_updates_notice_v2";

export default function CampaignManagementView(
  props: CampaignManagementProps,
) {
  const [updatesNoticeOpen, setUpdatesNoticeOpen] = useState(true);
  const [importPreset, setImportPreset] = useState<{
    initialImportMode: "new" | "existing";
    initialSelectedCampaignId: string | null;
    initialExistingImportSource: "file" | "single";
  }>({
    initialImportMode: "new",
    initialSelectedCampaignId: null,
    initialExistingImportSource: "file",
  });
  const {
    campaignRows,
    pendingDeletionCampaignRows,
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
    openClientsModal,
    savingName,
    restoringCampaignId,
    selectedCampaignForDeletion,
    selectedCampaignForClients,
    selectedOperationId,
    showClientsModal,
    showImportModal,
    syncing,
    sortDirection,
    sortKey,
    togglingLockCampaignId,
    totals,
    openEditName,
    openDeleteCampaign,
    closeDeleteCampaign,
    openExport,
    saveName,
    setEditName,
    setEditOpen,
    setExportOpen,
    setShowImportModal,
    syncNow,
    closeClientsModal,
    handleSortChange,
    handleClientsMoved,
    handleDeleteCampaign,
    handleImportSuccess,
    handleRestoreCampaign,
    handleToggleLock,
  } = useCampaignManagement(props);

  const openDefaultImport = () => {
    setImportPreset({
      initialImportMode: "new",
      initialSelectedCampaignId: null,
      initialExistingImportSource: "file",
    });
    setShowImportModal(true);
  };

  const openQuickAppendImport = (campaignId: string) => {
    setImportPreset({
      initialImportMode: "existing",
      initialSelectedCampaignId: campaignId,
      initialExistingImportSource: "file",
    });
    setShowImportModal(true);
  };

  if (!isAdmin) {
    return (
      <div className={cn(campaignCardClass, "bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.72))]")}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.35rem] border border-white/72 bg-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
            <Users className="w-5 h-5 text-brand" />
          </div>
          <div>
            <div className={campaignEyebrowClass}>Acceso restringido</div>
            <div className={cn(campaignTitleClass, "mt-3")}>Gestion de Campañas</div>
            <div className={campaignSubTextClass}>Disponible solo para administradores.</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={campaignCardClass}>
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
        onImport={openDefaultImport}
        onRefresh={syncNow}
      />

      {error ? <CampaignManagementErrorCard error={error} /> : null}

      <GeneralNoticeModal
        open={updatesNoticeOpen}
        onClose={() => setUpdatesNoticeOpen(false)}
        dismissKey={CAMPAIGNS_ADMIN_UPDATES_NOTICE_KEY}
        variant="info"
        title="Cambios en campanas"
        message={
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              Al abrir una campana puedes filtrar sus clientes y seleccionar
              visibles o todos los filtrados.
            </li>
            <li>
              La operacion sobre seleccionados permite mover de campana,
              asignar agente, desasignar o combinar base y agente.
            </li>
            <li>
              Si solo cambias de campana, puedes decidir si se mantiene la
              asignacion actual o si los clientes quedan sin agente.
            </li>
            <li>
              Las campanas retiradas quedan en una bandeja temporal durante 7
              dias para descargarlas, recuperarlas o borrarlas definitivamente.
            </li>
          </ul>
        }
        primaryText="Entendido"
      />

      <CampaignsTable
        campaigns={campaignRows}
        deletingCampaignId={deletingCampaignId}
        onSortChange={handleSortChange}
        togglingLockCampaignId={togglingLockCampaignId}
        sortDirection={sortDirection}
        sortKey={sortKey}
        onDelete={openDeleteCampaign}
        onEditName={openEditName}
        onExport={openExport}
        onQuickAppend={(campaign) => openQuickAppendImport(campaign.id)}
        onOpenClients={openClientsModal}
        onToggleLock={handleToggleLock}
      />

      <PendingDeletionCampaignsPanel
        campaigns={pendingDeletionCampaignRows}
        deletingCampaignId={deletingCampaignId}
        restoringCampaignId={restoringCampaignId}
        onDelete={openDeleteCampaign}
        onRestore={handleRestoreCampaign}
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

      <DeleteCampaignConfirmModal
        campaign={selectedCampaignForDeletion}
        isOpen={Boolean(selectedCampaignForDeletion)}
        deleting={Boolean(deletingCampaignId)}
        onClose={closeDeleteCampaign}
        onConfirm={handleDeleteCampaign}
      />

      <ImportClientsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSuccess}
        selectedOperationId={selectedOperationId}
        initialImportMode={importPreset.initialImportMode}
        initialSelectedCampaignId={importPreset.initialSelectedCampaignId}
        initialExistingImportSource={importPreset.initialExistingImportSource}
      />

      <CampaignClientsModal
        campaign={selectedCampaignForClients}
        campaignsList={campaignRows}
        isOpen={showClientsModal}
        selectedOperationId={selectedOperationId}
        onClose={closeClientsModal}
        onMoved={handleClientsMoved}
      />
    </div>
  );
}
