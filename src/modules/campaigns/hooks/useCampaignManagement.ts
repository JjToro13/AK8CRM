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

  const totals = useMemo(
    () => buildCampaignTotals(campaignRows),
    [campaignRows],
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

  const loadCampaigns = async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
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
      if (requestId === requestIdRef.current) {
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

  const handleDeleteCampaign = async (campaign: CampaignViewRow) => {
    if (!selectedOperationId) {
      setError("Debes seleccionar una operacion valida antes de modificar campañas.");
      return;
    }

    const extraWarning =
      campaign.assigned > 0
        ? `\n\nOJO: Hay ${campaign.assigned} clientes asignados en esta campaña.`
        : "";

    const confirmed = window.confirm(
      `Eliminar la campaña ${campaign.prefix}? Se eliminaran todos los clientes ligados a esa campaña. Esta acción no se puede deshacer.${extraWarning}`,
    );

    if (!confirmed) return;

    try {
      setDeletingCampaignId(campaign.id);
      setError("");

      const { error: clientsError } = await campaigns.deleteClientsByCampaign(
        campaign.id,
        selectedOperationId,
      );
      if (clientsError) {
        console.error(clientsError);
        setError(
          `Error eliminando clientes de la campaña ${campaign.prefix}: ${clientsError.message}`,
        );
        return;
      }

      const { error: campaignError } = await campaigns.deleteCampaignRow(
        campaign.id,
        selectedOperationId,
      );
      if (campaignError) {
        console.warn("No se pudo borrar la fila de campaigns:", campaignError);
      }

      await loadCampaigns();
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
    await loadCampaigns();
    setShowImportModal(false);
  };

  return {
    campaignRows: sortedCampaignRows,
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
  };
}
