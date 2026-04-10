import { useEffect, useMemo, useRef, useState } from "react";
import { appEnv } from "../../../config/env";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../integrations/supabase/client";
import { canUseClientActions } from "../../../lib/supabase";
import {
  isClientStatusCode,
  type ClientStatusCode,
} from "../../../lib/utils";
import { notify } from "../../../shared/lib/notify";
import { agentNameMap } from "../../../shared/services/agent-name-map";
import { agents } from "../../agents/services/agents.service";
import { agentAssignments } from "../../assignments/services/agent-assignments.service";
import { calls as callsService } from "../../calls/services/calls.service";
import { calendar } from "../../calendar/services/calendar.service";
import {
  shouldOpenScheduledCallFollowUp,
  type ScheduledCall,
} from "../../calendar/types/calendar.types";
import { campaigns } from "../../campaigns/services/campaigns.service";
import { clients as clientsService } from "../services/clients.service";
import type { Client } from "../../../shared/types/crm";

const NOTICE_COOLDOWN_KEY = "general_notice_last_seen_v1";
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const CLIENTS_SEARCH_KEY = "clients_search_v1";
const CLIENTS_STATUS_FILTER_KEY = "clients_status_filter_v1";
const CLIENTS_CAMPAIGN_FILTER_KEY = "clients_campaign_filter_v1";
const CLIENTS_AGENT_FILTER_KEY = "clients_agent_filter_v1";
const CLIENTS_PAGE_SIZE_KEY = "clients_page_size_v1";
const CLIENTS_VIEW_STATE_KEY = "clients_view_state_v1";

export type ClientStatusFilter = "all" | ClientStatusCode;
export type ClientCampaignFilter = "all" | string;
export type ClientAgentFilter = "all" | string;
const UNASSIGNED_AGENT_FILTER = "__unassigned__";

export interface ClientManagementProps {
  isAdmin?: boolean;
  canSeeAllOperations?: boolean;
  operationReady?: boolean;
  activeOperationId?: string | null;
  operationId?: string | null;
}

function filterAssignedClients(
  clients: Client[],
  searchQuery: string,
  statusFilter: ClientStatusFilter,
  campaignFilter: ClientCampaignFilter,
  targetOperationId?: string | null,
) {
  const query = searchQuery.trim().toLowerCase();

  return clients.filter((client) => {
    const matchesOperation =
      !targetOperationId || client.operation_id === targetOperationId;
    const matchesStatus =
      statusFilter === "all" || (client.status_code ?? "NU") === statusFilter;
    const matchesCampaign =
      campaignFilter === "all" || client.campaign_id === campaignFilter;

    if (!matchesOperation || !matchesStatus || !matchesCampaign) return false;
    if (!query) return true;

    return (
      (client.first_name || client.name || "").toLowerCase().includes(query) ||
      client.serial.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      (client.source || client.trading_company || "")
        .toLowerCase()
        .includes(query)
    );
  });
}

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

export function useClientManagement(
  props: ClientManagementProps = {},
) {
  const {
    user,
    role,
    isAdmin: hookIsAdmin,
    canSeeAllOperations: hookCanSeeAllOperations,
    operationReady: hookOperationReady,
    activeOperationId: hookActiveOperationId,
    operationId: hookOperationId,
  } = useAuth();

  const isAdmin = props.isAdmin ?? hookIsAdmin;
  const canSeeAllOperations =
    props.canSeeAllOperations ?? hookCanSeeAllOperations;
  const operationReady = props.operationReady ?? hookOperationReady;
  const activeOperationId = props.activeOperationId ?? hookActiveOperationId;
  const operationId = props.operationId ?? hookOperationId;

  const opLocked = canSeeAllOperations && !operationReady;
  const canExecuteClientActions = canUseClientActions(role);

  const [clients, setClients] = useState<Client[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewHydrated, setViewHydrated] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());
  const [, setTick] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [campaignFilter, setCampaignFilter] =
    useState<ClientCampaignFilter>("all");
  const [assignedAgentFilter, setAssignedAgentFilter] =
    useState<ClientAgentFilter>("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedClientForEmail, setSelectedClientForEmail] =
    useState<Client | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedClientForSchedule, setSelectedClientForSchedule] =
    useState<Client | null>(null);
  const [selectedScheduledEvent, setSelectedScheduledEvent] =
    useState<ScheduledCall | null>(null);
  const [showScheduleFollowUpModal, setShowScheduleFollowUpModal] =
    useState(false);
  const [scheduleDraftDate, setScheduleDraftDate] = useState<Date | null>(null);
  const [scheduleAgents, setScheduleAgents] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [campaignFilterOptions, setCampaignFilterOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [agentFilterOptions, setAgentFilterOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedClientForAssignment, setSelectedClientForAssignment] =
    useState<Client | null>(null);
  const [assignmentAgents, setAssignmentAgents] = useState<
    Array<{ id: string; name: string; email?: string | null }>
  >([]);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const [error, setError] = useState("");
  const [callingClient, setCallingClient] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [callNoticeOpen, setCallNoticeOpen] = useState(false);

  const [totalClients, setTotalClients] = useState(0);
  const [unfilteredTotalClients, setUnfilteredTotalClients] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const pollTimerRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const lastTableViewportHeightRef = useRef<number | null>(null);
  const lastWindowScrollYRef = useRef(0);
  const shouldRestoreViewRef = useRef(false);
  const didInitPageResetRef = useRef(false);

  const enableCalls = appEnv.features.enableCalls;

  const totalPages = Math.max(1, Math.ceil(totalClients / rowsPerPage));
  const startItem =
    totalClients === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalClients);

  const persistViewState = (overrides?: {
    currentPage?: number;
    tableScrollTop?: number;
    windowScrollY?: number;
  }) => {
    try {
      const payload = {
        currentPage,
        tableScrollTop: lastScrollTopRef.current,
        windowScrollY: lastWindowScrollYRef.current,
        ...overrides,
      };

      sessionStorage.setItem(CLIENTS_VIEW_STATE_KEY, JSON.stringify(payload));
    } catch {
      //
    }
  };

  useEffect(() => {
    try {
      const lastSeenRaw = localStorage.getItem(NOTICE_COOLDOWN_KEY);
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
      const now = Date.now();

      if (
        !lastSeen ||
        Number.isNaN(lastSeen) ||
        now - lastSeen >= HOURS_24_MS
      ) {
        setNoticeOpen(true);
      }
    } catch {
      setNoticeOpen(true);
    }
  }, []);

  const handleCloseNotice = () => {
    try {
      localStorage.setItem(NOTICE_COOLDOWN_KEY, String(Date.now()));
    } catch {
      //
    }

    setNoticeOpen(false);
  };

  const openCallNotice = () => setCallNoticeOpen(true);
  const closeCallNotice = () => setCallNoticeOpen(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLIENTS_SEARCH_KEY);
      if (saved) setSearchQuery(saved);

      const savedStatusFilter = localStorage.getItem(CLIENTS_STATUS_FILTER_KEY);
      if (savedStatusFilter === "all" || isClientStatusCode(savedStatusFilter)) {
        setStatusFilter(savedStatusFilter);
      }

      const savedCampaignFilter = localStorage.getItem(CLIENTS_CAMPAIGN_FILTER_KEY);
      if (savedCampaignFilter?.trim()) {
        setCampaignFilter(savedCampaignFilter);
      }

      const savedAgentFilter = localStorage.getItem(CLIENTS_AGENT_FILTER_KEY);
      if (savedAgentFilter?.trim()) {
        setAssignedAgentFilter(savedAgentFilter);
      }

      const savedPageSize = localStorage.getItem(CLIENTS_PAGE_SIZE_KEY);
      if (savedPageSize) {
        const parsed = Number(savedPageSize);
        if ([15, 30, 50, 100].includes(parsed)) {
          setRowsPerPage(parsed);
        }
      }

      const savedViewRaw = sessionStorage.getItem(CLIENTS_VIEW_STATE_KEY);
      if (savedViewRaw) {
        const savedView = JSON.parse(savedViewRaw) as {
          currentPage?: number;
          tableScrollTop?: number;
          windowScrollY?: number;
        };

        if (
          Number.isFinite(savedView.currentPage) &&
          Number(savedView.currentPage) > 0
        ) {
          setCurrentPage(Number(savedView.currentPage));
        }

        if (
          Number.isFinite(savedView.tableScrollTop) &&
          Number(savedView.tableScrollTop) >= 0
        ) {
          lastScrollTopRef.current = Number(savedView.tableScrollTop);
          shouldRestoreViewRef.current = true;
        }

        if (
          Number.isFinite(savedView.windowScrollY) &&
          Number(savedView.windowScrollY) >= 0
        ) {
          lastWindowScrollYRef.current = Number(savedView.windowScrollY);
          shouldRestoreViewRef.current = true;
        }
      }
    } catch {
      //
    } finally {
      setViewHydrated(true);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        localStorage.setItem(CLIENTS_SEARCH_KEY, searchQuery);
      } catch {
        //
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_STATUS_FILTER_KEY, statusFilter);
    } catch {
      //
    }
  }, [statusFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_CAMPAIGN_FILTER_KEY, campaignFilter);
    } catch {
      //
    }
  }, [campaignFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_AGENT_FILTER_KEY, assignedAgentFilter);
    } catch {
      //
    }
  }, [assignedAgentFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_PAGE_SIZE_KEY, String(rowsPerPage));
    } catch {
      //
    }
  }, [rowsPerPage]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (!viewHydrated) return;

    if (!didInitPageResetRef.current) {
      didInitPageResetRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    campaignFilter,
    assignedAgentFilter,
    rowsPerPage,
    activeOperationId,
    operationId,
    viewHydrated,
  ]);

  useEffect(() => {
    if (!viewHydrated) return;
    persistViewState({ currentPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, viewHydrated]);

  useEffect(() => {
    if (!viewHydrated) return;

    const saveOnBackground = () => {
      lastWindowScrollYRef.current = window.scrollY;
      persistViewState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveOnBackground();
    };

    window.addEventListener("pagehide", saveOnBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      saveOnBackground();
      window.removeEventListener("pagehide", saveOnBackground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewHydrated,
    currentPage,
    rowsPerPage,
    searchQuery,
    activeOperationId,
    operationId,
  ]);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      //
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);
      return copied;
    } catch {
      return false;
    }
  };

  const handleCopy = async (label: string, value?: string | null) => {
    const text = (value ?? "").trim();
    if (!text) return;

    const copied = await copyToClipboard(text);
    if (!copied) {
      setError(`No se pudo copiar ${label}`);
      return;
    }

    notify.copied(label);
  };

  const loadClients = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    const currentTableHeight = tableScrollRef.current?.clientHeight ?? null;

    if (currentTableHeight && currentTableHeight > 0) {
      lastTableViewportHeightRef.current = currentTableHeight;
    }

    if (opLocked) {
      setClients([]);
      setTotalClients(0);
      setError("");
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) setRefreshing(true);
    else setInitialLoading(true);

    try {
      if (isAdmin) {
        const targetOperationId = canSeeAllOperations
          ? activeOperationId
          : operationId;

        if (!targetOperationId) {
          setClients([]);
          setTotalClients(0);
          setError("");
          setLastUpdatedAt(Date.now());
          return;
        }

        const query = searchQuery.trim();
        const [result, baselineResult] = await Promise.all([
          query
            ? clientsService.search(query, {
              operationId: targetOperationId,
              statusCode: statusFilter === "all" ? null : statusFilter,
              campaignId: campaignFilter === "all" ? null : campaignFilter,
              assignedAgentId:
                assignedAgentFilter === "all" ? null : assignedAgentFilter,
              page: currentPage,
              pageSize: rowsPerPage,
            })
          : clientsService.getAll(
              targetOperationId,
              currentPage,
              rowsPerPage,
              statusFilter === "all" ? null : statusFilter,
              campaignFilter === "all" ? null : campaignFilter,
              assignedAgentFilter === "all" ? null : assignedAgentFilter,
            ),
          clientsService.getAll(targetOperationId, 1, 1, null),
        ]);

        if (result.error) {
          console.error("Error cargando clientes:", result.error);
          setError("Error cargando clientes");
          setClients([]);
          setTotalClients(0);
        } else {
          const enrichedClients = await enrichClientsWithAssignedAgentNames(
            result.data || [],
          );
          setClients(enrichedClients);
          setTotalClients(result.count || 0);
          setUnfilteredTotalClients(baselineResult.count || 0);
          setLastUpdatedAt(Date.now());
          setError("");
        }

        return;
      }

      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        setError("No se pudo obtener la información del usuario");
        return;
      }

      const { data: assignedClients, error } =
        await agentAssignments.getAssignedClients(currentUser.data.user.id);

      if (error) {
        console.error("Error cargando clientes asignados:", error);
        setError("Error cargando clientes asignados");
        setClients([]);
        setTotalClients(0);
        setUnfilteredTotalClients(0);
      } else {
        const assignedList = ((assignedClients || []) as Client[]).filter(
          (client) =>
            !operationId || client.operation_id === operationId,
        );
        const filteredClients = filterAssignedClients(
          assignedList,
          searchQuery,
          statusFilter,
          campaignFilter,
          operationId,
        );
        const enrichedClients = await enrichClientsWithAssignedAgentNames(
          filteredClients,
        );

        setUnfilteredTotalClients(assignedList.length);
        setTotalClients(enrichedClients.length);

        const from = (currentPage - 1) * rowsPerPage;
        const to = from + rowsPerPage;
        setClients(enrichedClients.slice(from, to));
        setLastUpdatedAt(Date.now());
        setError("");
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
      setError("Error cargando clientes");
      setClients([]);
      setTotalClients(0);
      setUnfilteredTotalClients(0);
    } finally {
      if (silent) setRefreshing(false);
      else setInitialLoading(false);
    }
  };

  const refreshClientsPreservingScroll = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    const prevScrollTop =
      tableScrollRef.current?.scrollTop ?? lastScrollTopRef.current ?? 0;

    await loadClients({ silent: true });

    requestAnimationFrame(() => {
      if (tableScrollRef.current) {
        tableScrollRef.current.scrollTop = prevScrollTop;
      }

      isRefreshingRef.current = false;
    });
  };

  useEffect(() => {
    if (!viewHydrated) return;

    if (opLocked) {
      setClients([]);
      setTotalClients(0);
      setInitialLoading(false);
      setRefreshing(false);
      setError("");
      return;
    }

    setClients([]);
    setTotalClients(0);
    setError("");

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canSeeAllOperations,
    operationReady,
    activeOperationId,
    operationId,
    viewHydrated,
  ]);

  useEffect(() => {
    if (!viewHydrated) return;
    if (opLocked) return;

    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    rowsPerPage,
    searchQuery,
    statusFilter,
    campaignFilter,
    assignedAgentFilter,
    viewHydrated,
  ]);

  useEffect(() => {
    if (opLocked) {
      setCampaignFilterOptions([]);
      setAgentFilterOptions([]);
      return;
    }

    const targetOperationId = isAdmin
      ? (canSeeAllOperations ? activeOperationId : operationId)
      : operationId;

    if (!targetOperationId) {
      setCampaignFilterOptions([]);
      setAgentFilterOptions([]);
      return;
    }

    let cancelled = false;

    const loadFilterOptions = async () => {
      const [
        { data: campaignsData },
        { data: agentsData },
        { data: assignedClientsData, error: assignedClientsError },
      ] = await Promise.all([
        campaigns.list(targetOperationId),
        isAdmin
          ? agents.getAll()
          : Promise.resolve({ data: [] as never[], error: null }),
        !isAdmin && user?.id
          ? agentAssignments.getAssignedClients(user.id)
          : Promise.resolve({ data: [] as Client[], error: null }),
      ]);

      if (cancelled) return;

      if (assignedClientsError) {
        console.error(
          "Error cargando campañas permitidas para el agente:",
          assignedClientsError,
        );
      }

      const allowedCampaignIds = new Set(
        ((assignedClientsData ?? []) as Client[])
          .filter(
            (client) =>
              !targetOperationId || client.operation_id === targetOperationId,
          )
          .map((client) => client.campaign_id)
          .filter((campaignId): campaignId is string => Boolean(campaignId)),
      );

      setCampaignFilterOptions(
        (campaignsData ?? [])
          .filter((campaign) => isAdmin || allowedCampaignIds.has(campaign.id))
          .map((campaign) => ({
            id: campaign.id,
            label: campaign.display_name?.trim()
              ? `${campaign.display_name} · ${campaign.prefix}`
              : campaign.prefix,
          })),
      );

      setAgentFilterOptions(
        isAdmin
          ? [
              { id: UNASSIGNED_AGENT_FILTER, name: "Sin asignar" },
              ...(agentsData ?? [])
                .filter(
                  (agent) =>
                    agent.role === "agent" &&
                    agent.is_active !== false &&
                    agent.operation_id === targetOperationId,
                )
                .map((agent) => ({ id: agent.id, name: agent.name })),
            ]
          : [],
      );
    };

    loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [activeOperationId, canSeeAllOperations, isAdmin, opLocked, operationId, user?.id]);

  useEffect(() => {
    if (
      campaignFilter !== "all" &&
      campaignFilterOptions.length > 0 &&
      !campaignFilterOptions.some((campaign) => campaign.id === campaignFilter)
    ) {
      setCampaignFilter("all");
    }
  }, [campaignFilter, campaignFilterOptions]);

  useEffect(() => {
    if (
      assignedAgentFilter !== "all" &&
      agentFilterOptions.length > 0 &&
      !agentFilterOptions.some((agent) => agent.id === assignedAgentFilter)
    ) {
      setAssignedAgentFilter("all");
    }
  }, [agentFilterOptions, assignedAgentFilter]);

  useEffect(() => {
    if (opLocked) return;

    const shouldPoll = isAdmin && !showEditModal && !showEmailModal;

    if (shouldPoll) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      pollTimerRef.current = window.setInterval(() => {
        refreshClientsPreservingScroll();
      }, 45_000);
    }

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    showEditModal,
    showEmailModal,
    activeOperationId,
    operationId,
    operationReady,
    currentPage,
    rowsPerPage,
    searchQuery,
    statusFilter,
    campaignFilter,
    assignedAgentFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (initialLoading) return;

    const currentTableHeight = tableScrollRef.current?.clientHeight ?? null;
    if (currentTableHeight && currentTableHeight > 0) {
      lastTableViewportHeightRef.current = currentTableHeight;
    }
  }, [initialLoading, clients.length, rowsPerPage]);

  useEffect(() => {
    if (!viewHydrated || initialLoading || !shouldRestoreViewRef.current) return;

    requestAnimationFrame(() => {
      if (tableScrollRef.current) {
        tableScrollRef.current.scrollTop = lastScrollTopRef.current;
      }

      if (lastWindowScrollYRef.current > 0) {
        window.scrollTo({ top: lastWindowScrollYRef.current, left: 0 });
      }

      shouldRestoreViewRef.current = false;
    });
  }, [clients.length, currentPage, initialLoading, viewHydrated]);

  const handleDeleteClient = async (client: Client) => {
    if (!confirm("Estas seguro de que quieres eliminar este cliente?")) return;

    try {
      const { error } = await clientsService.delete(
        client.id,
        client.operation_id ?? undefined,
      );

      if (error) {
        console.error("Error eliminando cliente:", error);
        setError("Error eliminando cliente");
      } else {
        loadClients({ silent: true });
      }
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      setError("Error eliminando cliente");
    }
  };

  const handleEditClient = (client: Client) => {
    if (!canExecuteClientActions) return;
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleClientSaved = () => loadClients({ silent: true });

  const handleCallClient = async (client: Client) => {
    if (!canExecuteClientActions) return;
    setCallingClient(client.id);
    setError("");

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        setError("No se pudo obtener la información del agente");
        return;
      }

      const { data, error } = await callsService.start(
        client.id,
        currentUser.data.user.id,
      );

      if (error) {
        setError(error.message || "Error al iniciar la llamada");
      } else if (data && (data as any).call_id) {
        const callData = data as {
          call_id: string;
          client_name?: string;
          client_serial?: string;
          extension_number?: string;
        };

        alert(
          `Llamada iniciada con exito\n\n` +
            `Cliente: ${callData.client_name} (${callData.client_serial})\n` +
            `Extension: ${callData.extension_number}\n\n` +
            `La llamada sonara en tu softphone (MicroSIP/Zoiper)`,
        );
        loadClients({ silent: true });
      }
    } catch (error) {
      setError("Error inesperado al iniciar la llamada");
      console.error("Error iniciando llamada:", error);
    } finally {
      setCallingClient(null);
    }
  };

  const handleEmailClient = (client: Client) => {
    if (!canExecuteClientActions) return;
    setSelectedClientForEmail(client);
    setShowEmailModal(true);
  };

  const handleAssignClient = async (client: Client) => {
    if (!isAdmin) return;

    setError("");
    setSelectedClientForAssignment(client);
    setShowAssignmentModal(true);
    setAssignmentSaving(false);

    const { data, error } = await agents.getAll();
    if (error) {
      console.error("Error cargando agentes para asignacion:", error);
      setError("No se pudieron cargar los agentes disponibles");
      setAssignmentAgents([]);
      return;
    }

    const availableAgents = (data ?? [])
      .filter(
        (agent) =>
          agent.role === "agent" &&
          agent.is_active !== false &&
          (!client.operation_id || agent.operation_id === client.operation_id),
      )
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
      }));

    const currentAssignedStillMissing =
      client.assigned_to &&
      !availableAgents.some((agent) => agent.id === client.assigned_to);

    setAssignmentAgents(
      currentAssignedStillMissing
        ? [
            {
              id: client.assigned_to!,
              name: client.assigned_agent?.name?.trim() || client.assigned_to!,
              email: null,
            },
            ...availableAgents,
          ]
        : availableAgents,
    );
  };

  const loadScheduleAgentsForClient = async (client: Client) => {
    if (!isAdmin) {
      setScheduleAgents([]);
      return true;
    }

    const { data, error } = await agents.getAll();
    if (error) {
      console.error("Error cargando agentes para agenda:", error);
      setError("No se pudieron cargar los agentes para agendar la cita");
      setScheduleAgents([]);
      return false;
    }

    setScheduleAgents(
      (data ?? [])
        .filter(
          (agent) =>
            agent.role === "agent" &&
            agent.is_active !== false &&
            (!client.operation_id || agent.operation_id === client.operation_id),
        )
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
          email: agent.email,
        })),
    );

    return true;
  };

  const handleScheduleClient = async (client: Client) => {
    if (!canExecuteClientActions) return;
    setError("");
    setSelectedClientForSchedule(client);

    const agentsLoaded = await loadScheduleAgentsForClient(client);
    if (!agentsLoaded) return;

    const { data: existingEvent, error } = await calendar.findOpenByClient({
      clientId: client.id,
      operationId: client.operation_id ?? null,
    });

    if (error) {
      console.error("Error buscando cita existente para cliente:", error);
      setError("No se pudo revisar si el cliente ya tenía una cita abierta");
      setSelectedScheduledEvent(null);
      setShowScheduleFollowUpModal(false);
      setShowScheduleModal(true);
      return;
    }

    setSelectedScheduledEvent(existingEvent);

    if (!existingEvent) {
      setScheduleDraftDate(new Date());
      setShowScheduleFollowUpModal(false);
      setShowScheduleModal(true);
      return;
    }

    setScheduleDraftDate(new Date(existingEvent.scheduled_for));

    if (shouldOpenScheduledCallFollowUp(existingEvent)) {
      setShowScheduleModal(false);
      setShowScheduleFollowUpModal(true);
      return;
    }

    setShowScheduleFollowUpModal(false);
    setShowScheduleModal(true);
  };

  const closeEditModal = () => setShowEditModal(false);
  const closeEmailModal = () => setShowEmailModal(false);
  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedClientForAssignment(null);
    setAssignmentAgents([]);
    setAssignmentSaving(false);
  };
  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setShowScheduleFollowUpModal(false);
    setSelectedClientForSchedule(null);
    setSelectedScheduledEvent(null);
    setScheduleDraftDate(null);
    setScheduleSaving(false);
  };

  const closeScheduleFollowUpModal = () => {
    setShowScheduleFollowUpModal(false);
    setSelectedClientForSchedule(null);
    setSelectedScheduledEvent(null);
    setScheduleDraftDate(null);
    setScheduleSaving(false);
  };

  const handleScheduleCreated = async (payload: {
    tenant_id?: string | null;
    operation_id?: string | null;
    campaign_id?: string | null;
    client_id: string;
    agent_id: string;
    title?: string | null;
    notes?: string | null;
    outcome_notes?: string | null;
    status?: "scheduled" | "attended" | "postponed" | "missed";
    scheduled_for: string;
    scheduled_timezone: string;
  }) => {
    setScheduleSaving(true);
    const result = await calendar.create(payload);

    if (!result.error) {
      notify.appointmentCreated();
      closeScheduleModal();
      await loadClients({ silent: true });
    } else {
      setScheduleSaving(false);
    }

    return { error: result.error };
  };

  const handleScheduleUpdated = async (
    id: string,
    payload: Partial<
      Pick<
        ScheduledCall,
        | "agent_id"
        | "campaign_id"
        | "title"
        | "notes"
        | "outcome_notes"
        | "status"
        | "attended_at"
        | "scheduled_for"
        | "scheduled_timezone"
      >
    >,
  ) => {
    setScheduleSaving(true);
    const result = await calendar.update(id, payload);

    if (!result.error) {
      if (payload.status && payload.status !== "scheduled") {
        notify.followUpSaved();
      } else {
        notify.appointmentUpdated();
      }
      closeScheduleModal();
      await loadClients({ silent: true });
    } else {
      setScheduleSaving(false);
    }

    return { error: result.error };
  };

  const handleScheduleDeleted = async (id: string) => {
    setScheduleSaving(true);
    const result = await calendar.remove(id);

    if (!result.error) {
      notify.appointmentDeleted();
      closeScheduleModal();
      await loadClients({ silent: true });
    } else {
      setScheduleSaving(false);
    }

    return { error: result.error };
  };

  const openScheduleEditFromFollowUp = (event: ScheduledCall) => {
    setSelectedScheduledEvent(event);
    setScheduleDraftDate(new Date(event.scheduled_for));
    setShowScheduleFollowUpModal(false);
    setShowScheduleModal(true);
  };

  const handlePrevPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const handlePageInputSubmit = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(currentPage));
      return;
    }

    const safePage = Math.min(Math.max(1, parsed), totalPages);
    setCurrentPage(safePage);
    setPageInput(String(safePage));
  };

  const handleTableScroll = () => {
    if (!tableScrollRef.current) return;

    lastScrollTopRef.current = tableScrollRef.current.scrollTop;
    persistViewState({
      tableScrollTop: lastScrollTopRef.current,
      windowScrollY: window.scrollY,
    });
  };

  const updatedSecs = Math.floor((Date.now() - lastUpdatedAt) / 1000);
  const isSearchActive = searchQuery.trim().length > 0;
  const isStatusFilterActive = statusFilter !== "all";
  const isCampaignFilterActive = campaignFilter !== "all";
  const isAgentFilterActive = assignedAgentFilter !== "all";
  const activeFilterSummary = [
    isSearchActive ? searchQuery.trim() : null,
    statusFilter !== "all"
      ? ({
          NU: "Nuevo",
          LD: "Llamar despues",
          DP: "Deposito",
          SG: "Seguimiento",
          NC: "No contesta",
          NI: "No interesado",
          NX: "Numero no existe",
          NE: "Numero equivocado",
          RA: "Reasignar",
          FS: "Fin de seguimiento",
        } as const)[statusFilter]
      : null,
    isCampaignFilterActive
      ? campaignFilterOptions.find((campaign) => campaign.id === campaignFilter)
          ?.label ?? "Campaña"
      : null,
    isAgentFilterActive
      ? agentFilterOptions.find((agent) => agent.id === assignedAgentFilter)?.name ??
        "Agente"
      : null,
  ].filter(Boolean) as string[];
  const headerSubtitle = useMemo(() => {
    if (opLocked) return "Selecciona operación para habilitar clientes";
    return "Busca, revisa comentarios y gestiona la cartera";
  }, [opLocked]);

  const handleAssignmentSaved = async (agentId: string | null) => {
    if (!selectedClientForAssignment) return;

    setAssignmentSaving(true);
    setError("");

    const previousAgentLabel =
      selectedClientForAssignment.assigned_agent?.name?.trim() || "Sin asignar";
    const nextAgentLabel =
      agentId === null
        ? "Sin asignar"
        : assignmentAgents.find((agent) => agent.id === agentId)?.name ?? agentId;

    const { error: updateError } = await clientsService.update(
      selectedClientForAssignment.id,
      {
        assigned_to: agentId,
        updated_at: new Date().toISOString(),
      },
      selectedClientForAssignment.operation_id ?? undefined,
    );

    if (updateError) {
      console.error("Error actualizando asignacion del cliente:", updateError);
      setError("No se pudo actualizar la asignacion del cliente");
      setAssignmentSaving(false);
      return;
    }

    notify.clientAssignmentUpdated(
      `${previousAgentLabel} -> ${nextAgentLabel}`,
    );

    closeAssignmentModal();
    await loadClients({ silent: true });
  };

  return {
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
    selectedClient,
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
    scheduleDraftDate,
    scheduleAgents,
    assignmentAgents,
    scheduleSaving,
    assignmentSaving,
    error,
    callingClient,
    noticeOpen,
    handleCloseNotice,
    callNoticeOpen,
    openCallNotice,
    closeCallNotice,
    enableCalls,
    totalClients,
    unfilteredTotalClients,
    isSearchActive,
    isStatusFilterActive,
    isCampaignFilterActive,
    isAgentFilterActive,
    activeFilterSummary,
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
    handleDeleteClient,
    handleEditClient,
    handleClientSaved,
    handleCallClient,
    handleEmailClient,
    handleAssignClient,
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
    viewerAgentId: user?.id ?? null,
    unassignedAgentFilter: UNASSIGNED_AGENT_FILTER,
  };
}
