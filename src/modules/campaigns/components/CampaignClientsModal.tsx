import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft,
  CheckSquare,
  ListFilter,
  UserCog,
  Users,
} from "lucide-react";
import { agents, clients as clientsService, supabase } from "../../../lib/supabase";
import {
  cn,
  formatCurrency,
  getLegacyStatusColor,
  getStatusText,
  TRANSFERRED_CLIENT_STATUS_CODE,
  type ClientStatusCode,
} from "../../../lib/utils";
import type { Client } from "../../../shared/types/crm";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import Input from "../../../shared/components/ui/Input";
import Textarea from "../../../shared/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import { notify } from "../../../shared/lib/notify";
import { agentNameMap } from "../../../shared/services/agent-name-map";
import {
  CLIENT_BALANCE_RANGE_OPTIONS,
  type ClientBalanceRangeFilter,
} from "../../clients/lib/clientFilters";
import { applyClientListFilters } from "../../clients/services/clients.service";
import { campaigns } from "../services/campaigns.service";
import type { CampaignViewRow } from "../types/campaign.types";
import {
  campaignInsetClass,
  campaignModalFooterClass,
  campaignModalHeaderClass,
  campaignModalPanelClass,
} from "./campaignUi";
import { useClientStatusCatalog } from "../../../shared/hooks/useClientStatusCatalog";

type CampaignClientsModalProps = {
  campaign: CampaignViewRow | null;
  campaignsList: CampaignViewRow[];
  isOpen: boolean;
  selectedOperationId?: string | null;
  onClose: () => void;
  onMoved: () => Promise<void> | void;
};

type CampaignClientStatusFilter = "all" | ClientStatusCode;
type CampaignClientAssignmentFilter = "all" | string;

const STATUS_PLACEHOLDER = "__campaign_clients_status_placeholder__";
const BALANCE_PLACEHOLDER = "__campaign_clients_balance_placeholder__";
const ASSIGNMENT_PLACEHOLDER = "__campaign_clients_assignment_placeholder__";
const UNASSIGNED_AGENT_FILTER = "__unassigned__";
const ASSIGNED_ONLY_FILTER = "__assigned_only__";
const KEEP_AGENT_OPTION = "__keep_agent__";
const UNASSIGNED_AGENT_OPTION = "__unassigned_agent__";
const CAMPAIGN_MAX_FILTERED_SELECTION = 5000;

async function enrichClientsWithAssignedAgentNames(clients: Client[]) {
  const ids = Array.from(
    new Set(clients.map((client) => client.assigned_to).filter(Boolean)),
  ) as string[];

  if (ids.length === 0) {
    return clients.map((client) => ({
      ...client,
      assigned_agent: client.assigned_agent ?? null,
    }));
  }

  const map = await agentNameMap(ids);

  return clients.map((client) => ({
    ...client,
    assigned_agent: client.assigned_to
      ? { name: map.get(client.assigned_to) ?? client.assigned_to }
      : null,
  }));
}

export default function CampaignClientsModal({
  campaign,
  campaignsList,
  isOpen,
  selectedOperationId,
  onClose,
  onMoved,
}: CampaignClientsModalProps) {
  const { statusOptions } = useClientStatusCatalog();
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CampaignClientStatusFilter>("all");
  const [assignmentFilter, setAssignmentFilter] =
    useState<CampaignClientAssignmentFilter>("all");
  const [countryFilter, setCountryFilter] = useState("");
  const [balanceRangeFilter, setBalanceRangeFilter] =
    useState<ClientBalanceRangeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [targetCampaignId, setTargetCampaignId] = useState<string>("");
  const [targetAgentId, setTargetAgentId] = useState<string>(KEEP_AGENT_OPTION);
  const [keepAssignmentOnCampaignChange, setKeepAssignmentOnCampaignChange] =
    useState(true);
  const [agentOptions, setAgentOptions] = useState<
    Array<{ id: string; name: string; email?: string | null }>
  >([]);
  const [moveNotes, setMoveNotes] = useState("");
  const [error, setError] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalClients / rowsPerPage));
  const trimmedSearchQuery = searchQuery.trim();
  const trimmedCountryFilter = countryFilter.trim();

  const targetCampaignOptions = useMemo(
    () => campaignsList.filter((row) => row.id !== campaign?.id),
    [campaign?.id, campaignsList],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setStatusFilter("all");
    setAssignmentFilter("all");
    setCountryFilter("");
    setBalanceRangeFilter("all");
    setCurrentPage(1);
    setRowsPerPage(20);
    setSelectedClientIds([]);
    setTargetCampaignId("");
    setTargetAgentId(KEEP_AGENT_OPTION);
    setKeepAssignmentOnCampaignChange(true);
    setMoveNotes("");
    setError("");
  }, [campaign?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadAgents = async () => {
      const { data, error: agentsError } = await agents.getAll();

      if (cancelled) return;

      if (agentsError) {
        console.error("[CampaignClientsModal] loadAgents error:", agentsError);
        setAgentOptions([]);
        return;
      }

      setAgentOptions(
        (data ?? [])
          .filter(
            (agent) =>
              agent.role === "agent" &&
              agent.is_active !== false &&
              (!selectedOperationId || agent.operation_id === selectedOperationId),
          )
          .map((agent) => ({
            id: agent.id,
            name: agent.name,
            email: agent.email ?? null,
          })),
      );
    };

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedOperationId]);

  useEffect(() => {
    if (!isOpen || !campaign?.id) return;

    const loadClients = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          operationId: selectedOperationId ?? null,
          campaignId: campaign.id,
          statusCode: statusFilter === "all" ? null : statusFilter,
          assignedAgentId:
            assignmentFilter === "all" ? null : assignmentFilter,
          country: trimmedCountryFilter || null,
          balanceRange:
            balanceRangeFilter === "all" ? null : balanceRangeFilter,
          page: currentPage,
          pageSize: rowsPerPage,
        };

        const result = trimmedSearchQuery
          ? await clientsService.search(trimmedSearchQuery, params)
          : await clientsService.getAll(params);

        if (result.error) {
          throw result.error;
        }

        const enrichedClients = await enrichClientsWithAssignedAgentNames(
          result.data ?? [],
        );
        setClients(enrichedClients);
        setTotalClients(result.count ?? 0);
        setSelectedClientIds((current) =>
          current.filter((id) => enrichedClients.some((client) => client.id === id)),
        );
      } catch (loadError: any) {
        console.error("[CampaignClientsModal] loadClients error:", loadError);
        setError(loadError?.message || "No se pudo cargar la base.");
        setClients([]);
        setTotalClients(0);
        setSelectedClientIds([]);
      } finally {
        setLoading(false);
      }
    };

    void loadClients();
  }, [
    balanceRangeFilter,
    campaign?.id,
    currentPage,
    isOpen,
    reloadSeed,
    rowsPerPage,
    selectedOperationId,
    assignmentFilter,
    statusFilter,
    trimmedCountryFilter,
    trimmedSearchQuery,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPage(1);
  }, [
    assignmentFilter,
    balanceRangeFilter,
    isOpen,
    rowsPerPage,
    statusFilter,
    trimmedCountryFilter,
    trimmedSearchQuery,
  ]);

  const allVisibleSelected =
    clients.length > 0 && clients.every((client) => selectedClientIds.includes(client.id));
  const hasActiveClientFilters =
    trimmedSearchQuery.length > 0 ||
    statusFilter !== "all" ||
    assignmentFilter !== "all" ||
    trimmedCountryFilter.length > 0 ||
    balanceRangeFilter !== "all";
  const selectedVisibleClients = useMemo(
    () => clients.filter((client) => selectedClientIds.includes(client.id)),
    [clients, selectedClientIds],
  );
  const selectedVisibleAssignedCount = selectedVisibleClients.filter(
    (client) => Boolean(client.assigned_to),
  ).length;
  const hasCampaignChange = Boolean(targetCampaignId);
  const hasAgentChange = targetAgentId !== KEEP_AGENT_OPTION;
  const willClearAssignmentForMove =
    hasCampaignChange && !keepAssignmentOnCampaignChange && !hasAgentChange;
  const canApplySelection =
    selectedClientIds.length > 0 &&
    (hasCampaignChange || hasAgentChange || willClearAssignmentForMove);

  const buildAssignedAgentFilterValue = () =>
    assignmentFilter === "all" ? null : assignmentFilter;

  const loadFilteredClientIds = async () => {
    if (!campaign?.id) return [] as string[];
    if (!hasActiveClientFilters) {
      throw new Error("Activa al menos un filtro antes de seleccionar filtrados.");
    }
    if (totalClients > CAMPAIGN_MAX_FILTERED_SELECTION) {
      throw new Error(
        `Refina los filtros hasta ${CAMPAIGN_MAX_FILTERED_SELECTION.toLocaleString()} clientes o menos.`,
      );
    }

    const pageSize = 1000;
    const collectedIds: string[] = [];
    let from = 0;

    while (true) {
      let request = supabase
        .from("clients")
        .select("id")
        .eq("campaign_id", campaign.id);

      if (trimmedSearchQuery) {
        request = request.or(
          `first_name.ilike.%${trimmedSearchQuery}%,last_name.ilike.%${trimmedSearchQuery}%,serial.ilike.%${trimmedSearchQuery}%,email.ilike.%${trimmedSearchQuery}%,phone_number.ilike.%${trimmedSearchQuery}%`,
        );
      }

      const assignedAgentFilterValue = buildAssignedAgentFilterValue();
      if (assignedAgentFilterValue === UNASSIGNED_AGENT_FILTER) {
        request = request.is("assigned_to", null);
      } else if (assignedAgentFilterValue === ASSIGNED_ONLY_FILTER) {
        request = request.not("assigned_to", "is", null);
      } else if (assignedAgentFilterValue) {
        request = request.eq("assigned_to", assignedAgentFilterValue);
      }

      request = applyClientListFilters(request, {
        operationId: selectedOperationId ?? null,
        campaignId: campaign.id,
        statusCode: statusFilter === "all" ? null : statusFilter,
        country: trimmedCountryFilter || null,
        balanceRange:
          balanceRangeFilter === "all" ? null : balanceRangeFilter,
      });

      const { data, error: idsError } = await request.range(from, from + pageSize - 1);

      if (idsError) {
        throw idsError;
      }

      const ids = (data ?? []).map((row) => String((row as { id: string }).id));
      collectedIds.push(...ids);

      if (collectedIds.length > CAMPAIGN_MAX_FILTERED_SELECTION) {
        throw new Error(
          `Seleccion demasiado grande. Refina los filtros hasta ${CAMPAIGN_MAX_FILTERED_SELECTION.toLocaleString()} clientes o menos.`,
        );
      }

      if (ids.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return collectedIds;
  };

  const toggleVisibleSelection = () => {
    if (allVisibleSelected) {
      setSelectedClientIds((current) =>
        current.filter((id) => !clients.some((client) => client.id === id)),
      );
      return;
    }

    setSelectedClientIds((current) => {
      const next = new Set(current);
      clients.forEach((client) => next.add(client.id));
      return Array.from(next);
    });
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  };

  const toggleFilteredSelection = async () => {
    setSelectingAllFiltered(true);
    setError("");

    try {
      const filteredIds = await loadFilteredClientIds();

      if (filteredIds.length === 0) {
        setSelectedClientIds([]);
        return;
      }

      const allFilteredSelected = filteredIds.every((id) =>
        selectedClientIds.includes(id),
      );

      setSelectedClientIds((current) => {
        if (allFilteredSelected) {
          return current.filter((id) => !filteredIds.includes(id));
        }

        const next = new Set(current);
        filteredIds.forEach((id) => next.add(id));
        return Array.from(next);
      });
    } catch (selectionError: any) {
      console.error(
        "[CampaignClientsModal] toggleFilteredSelection error:",
        selectionError,
      );
      setError(
        selectionError?.message ||
          "No se pudieron seleccionar todos los filtrados.",
      );
    } finally {
      setSelectingAllFiltered(false);
    }
  };

  const clearFilteredSelection = async () => {
    setSelectingAllFiltered(true);
    setError("");

    try {
      const filteredIds = await loadFilteredClientIds();
      if (filteredIds.length === 0) return;

      setSelectedClientIds((current) =>
        current.filter((id) => !filteredIds.includes(id)),
      );
    } catch (selectionError: any) {
      console.error(
        "[CampaignClientsModal] clearFilteredSelection error:",
        selectionError,
      );
      setError(
        selectionError?.message ||
          "No se pudieron quitar los clientes filtrados.",
      );
    } finally {
      setSelectingAllFiltered(false);
    }
  };

  const handleApplySelected = async () => {
    if (!campaign?.id) return;

    if (selectedClientIds.length === 0) {
      setError("Debes seleccionar al menos un cliente.");
      return;
    }

    if (!hasCampaignChange && !hasAgentChange) {
      setError("Elige una campana destino, un agente o una desasignacion.");
      return;
    }

    setMoving(true);
    setError("");

    try {
      let movedCount = 0;

      if (targetCampaignId) {
        const result = await campaigns.moveClientsToCampaign({
          clientIds: selectedClientIds,
          targetCampaignId,
          reason: "campaign_admin_operation",
          notes: moveNotes.trim() || null,
        });

        if (result.error) {
          throw result.error;
        }

        movedCount = result.movedCount;
      }

      if (hasAgentChange || willClearAssignmentForMove) {
        const nextAssignedTo =
          targetAgentId === UNASSIGNED_AGENT_OPTION || willClearAssignmentForMove
            ? null
            : targetAgentId;
        const nowIso = new Date().toISOString();
        const currentUser =
          nextAssignedTo ? (await supabase.auth.getUser()).data.user : null;
        let transferredClientIds: string[] = [];

        if (nextAssignedTo) {
          const snapshotResult = await clientsService.getAssignmentSnapshots(
            selectedClientIds,
            selectedOperationId ?? undefined,
          );

          if (snapshotResult.error) {
            throw snapshotResult.error;
          }

          transferredClientIds = snapshotResult.data
            .filter((client) => client.assigned_to !== nextAssignedTo)
            .map((client) => client.id);
        }

        const assignmentResult = await clientsService.updateMany(
          selectedClientIds,
          {
            assigned_to: nextAssignedTo,
            assigned_at: nextAssignedTo ? nowIso : null,
            assigned_by: nextAssignedTo ? currentUser?.id ?? null : null,
            updated_at: nowIso,
          },
          selectedOperationId ?? undefined,
        );

        if (assignmentResult.error) {
          throw assignmentResult.error;
        }

        if (transferredClientIds.length > 0) {
          const transferStatusResult = await clientsService.updateMany(
            transferredClientIds,
            {
              status_code: TRANSFERRED_CLIENT_STATUS_CODE,
              status_color: getLegacyStatusColor(TRANSFERRED_CLIENT_STATUS_CODE),
              updated_at: nowIso,
            },
            selectedOperationId ?? undefined,
          );

          if (transferStatusResult.error) {
            throw transferStatusResult.error;
          }
        }
      }

      const changedCount = targetCampaignId ? movedCount : selectedClientIds.length;
      notify.success(
        "Clientes actualizados",
        `Se actualizaron ${changedCount} cliente${changedCount === 1 ? "" : "s"}.`,
      );

      setSelectedClientIds([]);
      setTargetCampaignId("");
      setTargetAgentId(KEEP_AGENT_OPTION);
      setKeepAssignmentOnCampaignChange(true);
      setMoveNotes("");
      await onMoved();
      setReloadSeed((value) => value + 1);
    } catch (moveError: any) {
      console.error("[CampaignClientsModal] applySelected error:", moveError);
      setError(moveError?.message || "No se pudieron actualizar los clientes.");
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (moving) return;
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

      <ModalPanel
        className={cn(
          campaignModalPanelClass,
          "relative my-auto flex max-h-[min(94vh,980px)] w-full max-w-7xl flex-col",
        )}
      >
        <ModalHeader
          icon={<Users className="h-5 w-5 text-brand" />}
          title={`Clientes de ${campaign.name}`}
          description={`${campaign.prefix} - ${campaign.total.toLocaleString()} registros`}
          onClose={onClose}
          closeDisabled={moving}
          className={campaignModalHeaderClass}
        />

        <ModalBody className="min-h-0 space-y-5 overflow-y-auto">
          {error ? (
            <div className="rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.78))] px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <section className={cn(campaignInsetClass, "p-4")}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink/80">
              <ListFilter className="h-4 w-4 text-brand" />
              Filtros de la base
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Buscar
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Nombre, serial, email o telefono"
                />
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Estatus
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (value === STATUS_PLACEHOLDER) return;
                    setStatusFilter(value as CampaignClientStatusFilter);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_PLACEHOLDER} disabled>
                      Todos los estatus
                    </SelectItem>
                    <SelectItem value="all">Todos los estatus</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.code} value={status.code}>
                        {status.shortLabel} - {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Pais
                </div>
                <Input
                  type="text"
                  value={countryFilter}
                  onChange={(event) => setCountryFilter(event.target.value)}
                  placeholder="Ej. Mexico"
                />
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Asignado a
                </div>
                <Select
                  value={assignmentFilter}
                  onValueChange={(value) => {
                    if (value === ASSIGNMENT_PLACEHOLDER) return;
                    setAssignmentFilter(value as CampaignClientAssignmentFilter);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ASSIGNMENT_PLACEHOLDER} disabled>
                      Todos
                    </SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={ASSIGNED_ONLY_FILTER}>
                      Con asignacion
                    </SelectItem>
                    <SelectItem value={UNASSIGNED_AGENT_FILTER}>
                      Sin asignacion
                    </SelectItem>
                    {agentOptions.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                        {agent.email ? ` - ${agent.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,16rem)_auto]">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Rango de saldo
                </div>
                <Select
                  value={balanceRangeFilter}
                  onValueChange={(value) => {
                    if (value === BALANCE_PLACEHOLDER) return;
                    setBalanceRangeFilter(value as ClientBalanceRangeFilter);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los saldos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BALANCE_PLACEHOLDER} disabled>
                      Todos los saldos
                    </SelectItem>
                    {CLIENT_BALANCE_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end justify-start md:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setAssignmentFilter("all");
                    setCountryFilter("");
                    setBalanceRangeFilter("all");
                  }}
                  className={modalSecondaryActionClassName}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </section>

          <section className={cn(campaignInsetClass, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 px-4 py-3 text-sm text-muted">
              <div>
                {totalClients.toLocaleString()} clientes - pagina {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleFilteredSelection()}
                  disabled={
                    loading ||
                    selectingAllFiltered ||
                    totalClients === 0 ||
                    !hasActiveClientFilters ||
                    totalClients > CAMPAIGN_MAX_FILTERED_SELECTION
                  }
                  className={modalSecondaryActionClassName}
                >
                  <CheckSquare className="h-4 w-4" />
                  {selectingAllFiltered
                    ? "Procesando..."
                    : hasActiveClientFilters
                      ? "Seleccionar filtrados"
                      : "Filtra primero"}
                </button>
                <button
                  type="button"
                  onClick={toggleVisibleSelection}
                  className={modalSecondaryActionClassName}
                >
                  <CheckSquare className="h-4 w-4" />
                  {allVisibleSelected ? "Quitar visibles" : "Seleccionar visibles"}
                </button>
                <button
                  type="button"
                  onClick={() => void clearFilteredSelection()}
                  disabled={
                    loading ||
                    selectingAllFiltered ||
                    totalClients === 0 ||
                    !hasActiveClientFilters ||
                    totalClients > CAMPAIGN_MAX_FILTERED_SELECTION
                  }
                  className={modalSecondaryActionClassName}
                >
                  Retirar de la seleccion
                </button>
                <span>{selectedClientIds.length} seleccionados</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="sm" text="Cargando base..." fullScreen={false} />
              </div>
            ) : clients.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                No hay clientes que coincidan con estos filtros.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-white/70 bg-white/45 text-left text-[11px] uppercase tracking-[0.18em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Sel.</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Serial</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Pais</th>
                      <th className="px-4 py-3">Saldo</th>
                      <th className="px-4 py-3">Estatus</th>
                      <th className="px-4 py-3">Asignacion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/55">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-white/35">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.id)}
                            onChange={() => toggleClientSelection(client.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">
                            {client.first_name || client.name || "Sin nombre"}{" "}
                            {client.last_name || ""}
                          </div>
                          <div className="text-xs text-muted">{client.email || "-"}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-ink/80">
                          {client.serial}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink/80">
                          <div>{client.phone_number || "-"}</div>
                          <div className="text-xs text-muted">{client.email || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink/80">
                          {client.country || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-ink">
                          {client.user_balance != null
                            ? formatCurrency(client.user_balance)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink/80">
                          {getStatusText(client)}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink/80">
                          {client.assigned_to
                            ? client.assigned_agent?.name?.trim() ||
                              agentOptions.find((agent) => agent.id === client.assigned_to)
                                ?.name ||
                              client.assigned_to
                            : "Sin asignar"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Mostrar</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(value) => setRowsPerPage(Number(value))}
                >
                  <SelectTrigger className="min-w-[92px]">
                    <SelectValue placeholder="20" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  className={modalSecondaryActionClassName}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className={modalSecondaryActionClassName}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>

          <section className={cn(campaignInsetClass, "p-4")}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink/80">
              <ArrowRightLeft className="h-4 w-4 text-brand" />
              Operacion sobre seleccionados
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,18rem)_minmax(0,1fr)]">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Campana destino
                </div>
                <Select value={targetCampaignId} onValueChange={setTargetCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona campana destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetCampaignOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.prefix} - {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  <UserCog className="h-3.5 w-3.5 text-brand" />
                  Agente
                </div>
                <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mantener asignacion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KEEP_AGENT_OPTION}>
                      Mantener asignacion
                    </SelectItem>
                    <SelectItem value={UNASSIGNED_AGENT_OPTION}>
                      Sin asignar
                    </SelectItem>
                    {agentOptions.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                        {agent.email ? ` - ${agent.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Nota
                </div>
                <Textarea
                  value={moveNotes}
                  onChange={(event) => setMoveNotes(event.target.value)}
                  rows={3}
                  placeholder="Motivo o nota interna del movimiento"
                />
              </div>
            </div>

            {hasCampaignChange && !hasAgentChange ? (
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/70 bg-white/58 p-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={keepAssignmentOnCampaignChange}
                  onChange={(event) =>
                    setKeepAssignmentOnCampaignChange(event.target.checked)
                  }
                  disabled={moving}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  Mantener la asignacion actual al cambiar de campana.
                  <span className="block text-xs text-muted">
                    Si lo desmarcas, los seleccionados quedaran sin agente.
                  </span>
                </span>
              </label>
            ) : null}
          </section>
        </ModalBody>

        <ModalFooter
          className={cn("justify-between max-sm:flex-wrap", campaignModalFooterClass)}
        >
          <div className="text-sm text-muted">
            {selectedClientIds.length} seleccionado{selectedClientIds.length === 1 ? "" : "s"}
            {selectedVisibleClients.length > 0 ? (
              <>
                {" - "}
                {selectedVisibleAssignedCount} asignado{selectedVisibleAssignedCount === 1 ? "" : "s"} visibles
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={moving}
              className={modalSecondaryActionClassName}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={moving || !canApplySelection}
              className={modalPrimaryActionClassName}
            >
              {moving ? (
                <LoadingSpinner size="sm" text="Aplicando..." fullScreen={false} />
              ) : (
                "Aplicar cambios"
              )}
            </button>
          </div>
        </ModalFooter>
      </ModalPanel>
    </div>,
    document.body,
  );
}
