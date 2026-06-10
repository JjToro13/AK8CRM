import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../auth/services/auth.service";
import {
  buildCampaignTotals,
  buildCampaignViewRows,
  resolveCampaignName,
} from "../domain/campaign-formatters";
import { campaigns } from "../services/campaigns.service";
import type {
  CampaignExportOption,
  CampaignManagementProps,
  CampaignSortDirection,
  CampaignSortKey,
  CampaignViewRow,
} from "../types/campaign.types";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../shared/lib/notify";

export function useCampaignManagement({
  selectedOperationId,
}: CampaignManagementProps) {
  const { isAdmin, canSeeAllOperations, operationReady } = useAuth();
  const requestIdRef = useRef(0);

  const [campaignRows, setCampaignRows] = useState<CampaignViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [restoringCampaignId, setRestoringCampaignId] = useState<string | null>(null);
  const [togglingLockCampaignId, setTogglingLockCampaignId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
  const [editPrefix, setEditPrefix] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportCampaignId, setExportCampaignId] = useState("");
  const [sortKey, setSortKey] = useState<CampaignSortKey>("importedAt");
  const [sortDirection, setSortDirection] = useState<CampaignSortDirection>("asc");
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [selectedClientsCampaignId, setSelectedClientsCampaignId] =
    useState<string | null>(null);
  const [deleteConfirmCampaignId, setDeleteConfirmCampaignId] =
    useState<string | null>(null);

  const sortedCampaignRows = useMemo(() => {
    const toTime = (value: string | null) => {
      if (!value) return 0;
      const ts = new Date(value).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    };

    const compareValues = (left: CampaignViewRow, right: CampaignViewRow) => {
      switch (sortKey) {
        case "prefix":
          return left.prefix.localeCompare(right.prefix, "es", {
            sensitivity: "base",
          });
        case "name":
          return left.name.localeCompare(right.name, "es", {
            sensitivity: "base",
          });
        case "total":
          return left.total - right.total;
        case "assigned":
          return left.assigned - right.assigned;
        case "available":
          return left.available - right.available;
        case "importedAt":
          return toTime(left.importedAt) - toTime(right.importedAt);
        case "isLocked":
          return Number(left.isLocked) - Number(right.isLocked);
        default:
          return 0;
      }
    };

    return [...campaignRows].sort((left, right) => {
      const primary = compareValues(left, right);
      if (primary !== 0) {
        return sortDirection === "asc" ? primary : -primary;
      }

      return left.prefix.localeCompare(right.prefix, "es", {
        sensitivity: "base",
      });
    });
  }, [campaignRows, sortDirection, sortKey]);
  const activeCampaignRows = useMemo(
    () => sortedCampaignRows.filter((campaign) => !campaign.deletionRequestedAt),
    [sortedCampaignRows],
  );
  const pendingDeletionCampaignRows = useMemo(
    () => sortedCampaignRows.filter((campaign) => campaign.deletionRequestedAt),
    [sortedCampaignRows],
  );

  const totals = useMemo(
    () => buildCampaignTotals(activeCampaignRows),
    [activeCampaignRows],
  );
  const selectedCampaignForClients = useMemo(
    () =>
      campaignRows.find((campaign) => campaign.id === selectedClientsCampaignId) ??
      null,
    [campaignRows, selectedClientsCampaignId],
  );
  const selectedCampaignForDeletion = useMemo(
    () =>
      campaignRows.find((campaign) => campaign.id === deleteConfirmCampaignId) ??
      null,
    [campaignRows, deleteConfirmCampaignId],
  );

  const exportOptions = useMemo<CampaignExportOption[]>(
    () =>
      sortedCampaignRows.map((campaign) => ({
        id: campaign.id,
        prefix: campaign.prefix,
        name: campaign.name,
        total: campaign.total,
        available: campaign.available,
      })),
    [sortedCampaignRows],
  );

  const loadCampaigns = async (options?: { silent?: boolean }) => {
    const requestId = ++requestIdRef.current;
    const silent = options?.silent ?? false;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError("");

      const [{ data: metadataRows, error: metadataError }, { data: statsRows, error: statsError }] =
        await Promise.all([
          campaigns.list(selectedOperationId),
          campaigns.getStats(selectedOperationId),
        ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (metadataError) {
        console.error(metadataError);
        setError("Error cargando campañas.");
        return;
      }

      if (statsError) {
        console.error(statsError);
        setError("Error cargando estadísticas de campañas.");
        return;
      }

      const nextCampaignRows = buildCampaignViewRows(metadataRows, statsRows);
      setCampaignRows(nextCampaignRows);

      if (!exportCampaignId && nextCampaignRows.length > 0) {
        const defaultCampaign =
          [...nextCampaignRows].sort((left, right) => {
            const leftTime = left.importedAt ? new Date(left.importedAt).getTime() : 0;
            const rightTime = right.importedAt ? new Date(right.importedAt).getTime() : 0;
            return rightTime - leftTime;
          })[0] ?? nextCampaignRows[0];

        setExportCampaignId(defaultCampaign.id);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Error inesperado cargando campañas.",
      );
    } finally {
      if (!silent && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setCampaignRows([]);
      setLoading(false);
      return;
    }

    if (canSeeAllOperations && (!operationReady || !selectedOperationId)) {
      requestIdRef.current += 1;
      setCampaignRows([]);
      setLoading(false);
      setError("");
      return;
    }

    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, canSeeAllOperations, operationReady, selectedOperationId]);

  const syncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    await loadCampaigns();
    setSyncing(false);
  };

  const openDeleteCampaign = (campaign: CampaignViewRow) => {
    setDeleteConfirmCampaignId(campaign.id);
  };

  const closeDeleteCampaign = () => {
    if (deletingCampaignId) return;
    setDeleteConfirmCampaignId(null);
  };

  const handleDeleteCampaign = async () => {
    const campaign = selectedCampaignForDeletion;
    if (!campaign) return;

    if (!selectedOperationId) {
      setError("Debes seleccionar una operacion valida antes de modificar campañas.");
      return;
    }

    try {
      setDeletingCampaignId(campaign.id);
      setError("");

      const now = new Date();
      const isPendingDeletion = Boolean(campaign.deletionRequestedAt);

      if (!isPendingDeletion) {
        const currentUser = await auth.getCurrentUser();
        const availableAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const { error: stageError, affectedClients } =
          await campaigns.stageDeletion(campaign.id, selectedOperationId, {
            requestedBy: currentUser?.id ?? null,
            requestedAt: now.toISOString(),
            availableAt: availableAt.toISOString(),
            reason: "campaign_retirement_grace_period",
          });

        if (stageError) {
          console.error(stageError);
          setError(
            `No se pudo retirar la campaña ${campaign.prefix}: ${stageError.message}`,
          );
          return;
        }

        notify.info(
          "Campaña retirada",
          `${(affectedClients ?? 0).toLocaleString()} clientes fueron desasignados y ocultos por 7 dias.`,
        );
        setDeleteConfirmCampaignId(null);
        await loadCampaigns();
        return;
      }

      const {
        error: deleteError,
        deletedClients,
        deletedCampaigns,
      } = await campaigns.deleteCampaignPermanently(
        campaign.id,
        selectedOperationId,
      );
      if (deleteError) {
        console.error(deleteError);
        setError(
          `No se pudo borrar definitivamente la campaña ${campaign.prefix}: ${deleteError.message}`,
        );
        return;
      }

      if (deletedCampaigns <= 0) {
        setError(`No se encontro la campaña ${campaign.prefix} para borrar definitivamente.`);
        return;
      }

      notify.success(
        "Campaña eliminada",
        `${deletedClients.toLocaleString()} clientes fueron borrados definitivamente.`,
      );
      await loadCampaigns();
      setDeleteConfirmCampaignId(null);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : `Error inesperado eliminando la campaña ${campaign.prefix}.`,
      );
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleToggleLock = async (campaign: CampaignViewRow) => {
    if (!selectedOperationId) {
      setError("Debes seleccionar una operacion valida antes de modificar campañas.");
      return;
    }

    try {
      setTogglingLockCampaignId(campaign.id);
      setError("");

      const currentUser = await auth.getCurrentUser();
      const nextLocked = !campaign.isLocked;

      const { error } = await campaigns.updateLock(
        campaign.id,
        selectedOperationId,
        {
          is_locked: nextLocked,
          locked_at: nextLocked ? new Date().toISOString() : null,
          locked_by: nextLocked ? currentUser?.id ?? null : null,
          updated_at: new Date().toISOString(),
        },
      );

      if (error) {
        console.error(error);
        setError(
          `No se pudo ${nextLocked ? "bloquear" : "desbloquear"} la campaña: ${error.message}`,
        );
        return;
      }

      notify.info(
        nextLocked ? "Campaña bloqueada" : "Campaña desbloqueada",
        `La campaña ${campaign.prefix} quedó ${nextLocked ? "bloqueada" : "desbloqueada"}.`,
      );
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Error cambiando el bloqueo de la campaña.",
      );
    } finally {
      setTogglingLockCampaignId(null);
    }
  };

  const openEditName = (campaign: CampaignViewRow) => {
    setEditCampaignId(campaign.id);
    setEditPrefix(campaign.prefix);
    setEditName(
      campaign.name === resolveCampaignName(undefined, campaign.prefix)
        ? ""
        : campaign.name,
    );
    setEditOpen(true);
  };

  const saveName = async () => {
    if (!editCampaignId) return;
    if (!selectedOperationId) {
      setError("Debes seleccionar una operacion valida antes de modificar campañas.");
      return;
    }

    try {
      setSavingName(true);
      setError("");

      const { error } = await campaigns.updateName(
        editCampaignId,
        selectedOperationId,
        editName.trim() || null,
      );

      if (error) {
        console.error(error);
        setError(`No se pudo actualizar el nombre: ${error.message}`);
        return;
      }

      notify.success(
        "Nombre actualizado",
        "La campaña se renombró correctamente.",
      );
      setEditOpen(false);
      setEditCampaignId(null);
      setEditPrefix(null);
      setEditName("");
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Error guardando el nombre.",
      );
    } finally {
      setSavingName(false);
    }
  };

  const openExport = (campaignId?: string) => {
    const nextCampaignId =
      campaignId || exportCampaignId || sortedCampaignRows[0]?.id || "";
    setExportCampaignId(nextCampaignId);
    setExportOpen(true);
  };

  const handleSortChange = (nextKey: CampaignSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const handleImportSuccess = async () => {
    await loadCampaigns({ silent: true });
  };

  const openClientsModal = (campaign: CampaignViewRow) => {
    setSelectedClientsCampaignId(campaign.id);
    setShowClientsModal(true);
  };

  const closeClientsModal = () => {
    setShowClientsModal(false);
    setSelectedClientsCampaignId(null);
  };

  const handleClientsMoved = async () => {
    await loadCampaigns();
  };

  const handleRestoreCampaign = async (campaign: CampaignViewRow) => {
    if (!selectedOperationId) {
      setError("Debes seleccionar una operacion valida antes de restaurar campañas.");
      return;
    }

    try {
      setRestoringCampaignId(campaign.id);
      setError("");

      const { error: restoreError, restoredClients } =
        await campaigns.restoreDeletion(campaign.id, selectedOperationId);

      if (restoreError) {
        console.error(restoreError);
        setError(`No se pudo restaurar la campaña: ${restoreError.message}`);
        return;
      }

      notify.success(
        "Campaña restaurada",
        `${(restoredClients ?? 0).toLocaleString()} clientes vuelven a estar visibles.`,
      );
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Error restaurando la campaña.",
      );
    } finally {
      setRestoringCampaignId(null);
    }
  };

  return {
    campaignRows: activeCampaignRows,
    pendingDeletionCampaignRows,
    closeClientsModal,
    deletingCampaignId,
    editName,
    editOpen,
    editCampaignId,
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
    selectedOperationId,
    selectedCampaignForClients,
    selectedCampaignForDeletion,
    showImportModal,
    showClientsModal,
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
    handleSortChange,
    handleDeleteCampaign,
    handleImportSuccess,
    handleClientsMoved,
    handleRestoreCampaign,
    handleToggleLock,
  };
}
