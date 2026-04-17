import { useEffect, useMemo, useRef, useState } from "react";
import { appEnv } from "../../../config/env";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../integrations/supabase/client";
import { canUseClientActions } from "../../../lib/supabase";
import { useBackendHealth } from "../../../shared/resilience/BackendHealthProvider";
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
import {
  getClientBalanceRangeLabel,
  type ClientBalanceRangeFilter,
} from "../lib/clientFilters";
import {
  type ClientDailyManagementFilter,
} from "../lib/clientFollowUp";
import {
  CLIENT_TABLE_DEFAULT_TEXT_FILTERS,
  CLIENT_TABLE_DEFAULT_VISIBLE_COLUMNS,
  type ClientTableColumnKey,
  type ClientTableSortDirection,
  type ClientTableSortKey,
  type ClientTableTextFilterKey,
  type ClientTableTextFilters,
} from "../components/clientTableColumns";
import type { Client } from "../../../shared/types/crm";

const NOTICE_COOLDOWN_KEY = "general_notice_last_seen_v1";
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const CLIENTS_SEARCH_KEY = "clients_search_v1";
const CLIENTS_STATUS_FILTER_KEY = "clients_status_filter_v1";
const CLIENTS_CAMPAIGN_FILTER_KEY = "clients_campaign_filter_v1";
const CLIENTS_AGENT_FILTER_KEY = "clients_agent_filter_v1";
const CLIENTS_COUNTRY_FILTER_KEY = "clients_country_filter_v1";
const CLIENTS_BALANCE_FILTER_KEY = "clients_balance_filter_v1";
const CLIENTS_DAILY_MANAGEMENT_FILTER_KEY = "clients_daily_management_filter_v1";
const CLIENTS_TABLE_VISIBLE_COLUMNS_KEY = "clients_table_visible_columns_v1";
const CLIENTS_TABLE_SORT_KEY = "clients_table_sort_key_v1";
const CLIENTS_TABLE_SORT_DIRECTION_KEY = "clients_table_sort_direction_v1";
const CLIENTS_TABLE_TEXT_FILTERS_KEY = "clients_table_text_filters_v1";
const CLIENTS_TABLE_SHOW_COLUMN_FILTERS_KEY =
  "clients_table_show_column_filters_v1";
const CLIENTS_PAGE_SIZE_KEY = "clients_page_size_v1";
const CLIENTS_VIEW_STATE_KEY = "clients_view_state_v1";
const CLIENTS_SEARCH_DEBOUNCE_MS = 400;
const CLIENTS_MIN_SEARCH_LENGTH = 2;
const CLIENTS_FOCUS_REFRESH_STALE_MS = 90_000;

export type ClientStatusFilter = "all" | ClientStatusCode;
export type ClientCampaignFilter = "all" | string;
export type ClientAgentFilter = "all" | string;
export type ClientCountryFilter = string;
const UNASSIGNED_AGENT_FILTER = "__unassigned__";

export interface ClientManagementProps {
  isAdmin?: boolean;
  canSeeAllOperations?: boolean;
  operationReady?: boolean;
  activeOperationId?: string | null;
  operationId?: string | null;
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
  const { reportBackendIssue, reportBackendSuccess, shouldReduceLoad } =
    useBackendHealth();

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [campaignFilter, setCampaignFilter] =
    useState<ClientCampaignFilter>("all");
  const [assignedAgentFilter, setAssignedAgentFilter] =
    useState<ClientAgentFilter>("all");
  const [countryFilter, setCountryFilter] = useState<ClientCountryFilter>("");
  const [balanceRangeFilter, setBalanceRangeFilter] =
    useState<ClientBalanceRangeFilter>("all");
  const [dailyManagementFilter, setDailyManagementFilter] =
    useState<ClientDailyManagementFilter>("all");
  const [visibleColumns, setVisibleColumns] = useState<ClientTableColumnKey[]>(
    CLIENT_TABLE_DEFAULT_VISIBLE_COLUMNS,
  );
  const [tableTextFilters, setTableTextFilters] = useState<ClientTableTextFilters>(
    CLIENT_TABLE_DEFAULT_TEXT_FILTERS,
  );
  const [debouncedTableTextFilters, setDebouncedTableTextFilters] =
    useState<ClientTableTextFilters>(CLIENT_TABLE_DEFAULT_TEXT_FILTERS);
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [sortKey, setSortKey] = useState<ClientTableSortKey>("created_at");
  const [sortDirection, setSortDirection] =
    useState<ClientTableSortDirection>("desc");
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
  const lastClientsLoadAtRef = useRef(0);

  const enableCalls = appEnv.features.enableCalls;

  const totalPages = Math.max(1, Math.ceil(totalClients / rowsPerPage));
  const startItem =
    totalClients === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalClients);
  const trimmedSearchQuery = searchQuery.trim();
  const trimmedDebouncedSearchQuery = debouncedSearchQuery.trim();
  const effectiveSearchQuery =
    trimmedDebouncedSearchQuery.length >= CLIENTS_MIN_SEARCH_LENGTH
      ? trimmedDebouncedSearchQuery
      : "";
  const isSearchPendingMinLength =
    trimmedSearchQuery.length > 0 &&
    trimmedSearchQuery.length < CLIENTS_MIN_SEARCH_LENGTH;

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

      const savedCountryFilter = localStorage.getItem(CLIENTS_COUNTRY_FILTER_KEY);
      if (savedCountryFilter) {
        setCountryFilter(savedCountryFilter);
      }

      const savedBalanceFilter = localStorage.getItem(CLIENTS_BALANCE_FILTER_KEY);
      if (
        savedBalanceFilter === "all" ||
        savedBalanceFilter === "negative" ||
        savedBalanceFilter === "zero_to_999" ||
        savedBalanceFilter === "1000_to_4999" ||
        savedBalanceFilter === "5000_plus"
      ) {
        setBalanceRangeFilter(savedBalanceFilter);
      }

      const savedDailyManagementFilter = localStorage.getItem(
        CLIENTS_DAILY_MANAGEMENT_FILTER_KEY,
      );
      if (
        savedDailyManagementFilter === "all" ||
        savedDailyManagementFilter === "commented_today" ||
        savedDailyManagementFilter === "pending_today"
      ) {
        setDailyManagementFilter(savedDailyManagementFilter);
      }

      const savedVisibleColumnsRaw = localStorage.getItem(
        CLIENTS_TABLE_VISIBLE_COLUMNS_KEY,
      );
      if (savedVisibleColumnsRaw) {
        const parsed = JSON.parse(savedVisibleColumnsRaw) as ClientTableColumnKey[];
        const validColumns = parsed.filter((column) =>
          CLIENT_TABLE_DEFAULT_VISIBLE_COLUMNS.includes(column) ||
          [
            "status",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "country",
            "source",
            "assigned_agent",
            "funnel",
            "deposit_amount",
            "net_deposit",
            "user_balance",
            "investment_date",
            "serial",
            "attempts",
            "comments",
            "created_at",
          ].includes(column),
        ) as ClientTableColumnKey[];

        if (validColumns.length > 0) {
          setVisibleColumns(validColumns);
        }
      }

      const savedSortKey = localStorage.getItem(CLIENTS_TABLE_SORT_KEY);
      if (
        savedSortKey === "first_name" ||
        savedSortKey === "last_name" ||
        savedSortKey === "email" ||
        savedSortKey === "phone_number" ||
        savedSortKey === "country" ||
        savedSortKey === "source" ||
        savedSortKey === "funnel" ||
        savedSortKey === "deposit_amount" ||
        savedSortKey === "net_deposit" ||
        savedSortKey === "user_balance" ||
        savedSortKey === "investment_date" ||
        savedSortKey === "serial" ||
        savedSortKey === "attempts" ||
        savedSortKey === "created_at"
      ) {
        setSortKey(savedSortKey);
      }

      const savedSortDirection = localStorage.getItem(
        CLIENTS_TABLE_SORT_DIRECTION_KEY,
      );
      if (savedSortDirection === "asc" || savedSortDirection === "desc") {
        setSortDirection(savedSortDirection);
      }

      const savedShowColumnFilters = localStorage.getItem(
        CLIENTS_TABLE_SHOW_COLUMN_FILTERS_KEY,
      );
      if (savedShowColumnFilters === "true" || savedShowColumnFilters === "false") {
        setShowColumnFilters(savedShowColumnFilters === "true");
      }

      const savedTableTextFiltersRaw = localStorage.getItem(
        CLIENTS_TABLE_TEXT_FILTERS_KEY,
      );
      if (savedTableTextFiltersRaw) {
        const parsed = JSON.parse(
          savedTableTextFiltersRaw,
        ) as Partial<ClientTableTextFilters>;

        setTableTextFilters({
          first_name:
            typeof parsed.first_name === "string" ? parsed.first_name : "",
          last_name:
            typeof parsed.last_name === "string" ? parsed.last_name : "",
          email: typeof parsed.email === "string" ? parsed.email : "",
          phone_number:
            typeof parsed.phone_number === "string" ? parsed.phone_number : "",
          source: typeof parsed.source === "string" ? parsed.source : "",
          serial: typeof parsed.serial === "string" ? parsed.serial : "",
        });
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
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, CLIENTS_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedTableTextFilters(tableTextFilters);
    }, CLIENTS_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [tableTextFilters]);

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
      localStorage.setItem(CLIENTS_COUNTRY_FILTER_KEY, countryFilter);
    } catch {
      //
    }
  }, [countryFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_BALANCE_FILTER_KEY, balanceRangeFilter);
    } catch {
      //
    }
  }, [balanceRangeFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENTS_DAILY_MANAGEMENT_FILTER_KEY,
        dailyManagementFilter,
      );
    } catch {
      //
    }
  }, [dailyManagementFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENTS_TABLE_VISIBLE_COLUMNS_KEY,
        JSON.stringify(visibleColumns),
      );
    } catch {
      //
    }
  }, [visibleColumns]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_TABLE_SORT_KEY, sortKey);
    } catch {
      //
    }
  }, [sortKey]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_TABLE_SORT_DIRECTION_KEY, sortDirection);
    } catch {
      //
    }
  }, [sortDirection]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENTS_TABLE_TEXT_FILTERS_KEY,
        JSON.stringify(tableTextFilters),
      );
    } catch {
      //
    }
  }, [tableTextFilters]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENTS_TABLE_SHOW_COLUMN_FILTERS_KEY,
        String(showColumnFilters),
      );
    } catch {
      //
    }
  }, [showColumnFilters]);

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
    debouncedSearchQuery,
    statusFilter,
    campaignFilter,
    assignedAgentFilter,
    countryFilter,
    balanceRangeFilter,
    dailyManagementFilter,
    debouncedTableTextFilters.first_name,
    debouncedTableTextFilters.last_name,
    debouncedTableTextFilters.email,
    debouncedTableTextFilters.phone_number,
    debouncedTableTextFilters.source,
    debouncedTableTextFilters.serial,
    sortKey,
    sortDirection,
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

    if (shouldReduceLoad) {
      setError("Modo reducido activo. La carga de clientes se pausa temporalmente.");
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

        const query = effectiveSearchQuery;
        const trimmedCountryFilter = countryFilter.trim();
        const hasScopedFilters =
          query.length > 0 ||
          statusFilter !== "all" ||
          campaignFilter !== "all" ||
          assignedAgentFilter !== "all" ||
          trimmedCountryFilter.length > 0 ||
          balanceRangeFilter !== "all" ||
          dailyManagementFilter !== "all" ||
          Object.values(debouncedTableTextFilters).some(
            (value) => value.trim().length > 0,
          );

        const result = await (
          query
            ? clientsService.search(query, {
                operationId: targetOperationId,
                statusCode: statusFilter === "all" ? null : statusFilter,
                campaignId: campaignFilter === "all" ? null : campaignFilter,
                assignedAgentId:
                  assignedAgentFilter === "all" ? null : assignedAgentFilter,
                country: trimmedCountryFilter || null,
                balanceRange:
                  balanceRangeFilter === "all" ? null : balanceRangeFilter,
                dailyManagement:
                  dailyManagementFilter === "all" ? null : dailyManagementFilter,
                textFilters: debouncedTableTextFilters,
                orderBy: sortKey,
                orderDirection: sortDirection,
                page: currentPage,
                pageSize: rowsPerPage,
              })
            : clientsService.getAll({
                operationId: targetOperationId,
                page: currentPage,
                pageSize: rowsPerPage,
                statusCode: statusFilter === "all" ? null : statusFilter,
                campaignId: campaignFilter === "all" ? null : campaignFilter,
                assignedAgentId:
                  assignedAgentFilter === "all" ? null : assignedAgentFilter,
                country: trimmedCountryFilter || null,
                balanceRange:
                  balanceRangeFilter === "all" ? null : balanceRangeFilter,
                dailyManagement:
                  dailyManagementFilter === "all" ? null : dailyManagementFilter,
                textFilters: debouncedTableTextFilters,
                orderBy: sortKey,
                orderDirection: sortDirection,
              })
        );

        if (result.error) {
          console.error("Error cargando clientes:", result.error);
          reportBackendIssue(result.error, "clients:list");
          setError("Error cargando clientes");
          setClients([]);
          setTotalClients(0);
        } else {
          const enrichedClients = await enrichClientsWithAssignedAgentNames(
            result.data || [],
          );
          setClients(enrichedClients);
          setTotalClients(result.count || 0);
          if (!hasScopedFilters) {
            setUnfilteredTotalClients(result.count || 0);
          }
          setLastUpdatedAt(Date.now());
          lastClientsLoadAtRef.current = Date.now();
          setError("");
          reportBackendSuccess("clients:list");
        }

        return;
      }

      if (!user?.id) {
        setError("No se pudo obtener la información del usuario");
        return;
      }

      const query = effectiveSearchQuery;
      const trimmedCountryFilter = countryFilter.trim();
      const hasScopedFilters =
        query.length > 0 ||
        statusFilter !== "all" ||
        campaignFilter !== "all" ||
        trimmedCountryFilter.length > 0 ||
        balanceRangeFilter !== "all" ||
        Object.values(debouncedTableTextFilters).some(
          (value) => value.trim().length > 0,
        );

      const { data: assignedClients, error, count } =
        await agentAssignments.getAssignedClientsPage(user.id, {
          operationId: operationId ?? null,
          searchQuery: query,
          statusCode: statusFilter === "all" ? null : statusFilter,
          campaignId: campaignFilter === "all" ? null : campaignFilter,
          country: trimmedCountryFilter || null,
          balanceRange:
            balanceRangeFilter === "all" ? null : balanceRangeFilter,
          textFilters: debouncedTableTextFilters,
          orderBy: sortKey,
          orderDirection: sortDirection,
          page: currentPage,
          pageSize: rowsPerPage,
        });

      if (error) {
        console.error("Error cargando clientes asignados:", error);
        reportBackendIssue(error, "clients:list");
        setError("Error cargando clientes asignados");
        setClients([]);
        setTotalClients(0);
      } else {
        const enrichedClients = await enrichClientsWithAssignedAgentNames(
          (assignedClients || []) as Client[],
        );

        setTotalClients(count || 0);
        if (!hasScopedFilters) {
          setUnfilteredTotalClients(count || 0);
        }
        setClients(enrichedClients);
        setLastUpdatedAt(Date.now());
        lastClientsLoadAtRef.current = Date.now();
        setError("");
        reportBackendSuccess("clients:list");
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
      reportBackendIssue(error, "clients:list");
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
    debouncedSearchQuery,
    statusFilter,
    campaignFilter,
    assignedAgentFilter,
    countryFilter,
    balanceRangeFilter,
    dailyManagementFilter,
    debouncedTableTextFilters.first_name,
    debouncedTableTextFilters.last_name,
    debouncedTableTextFilters.email,
    debouncedTableTextFilters.phone_number,
    debouncedTableTextFilters.source,
    debouncedTableTextFilters.serial,
    sortKey,
    sortDirection,
    viewHydrated,
  ]);

  useEffect(() => {
    if (!viewHydrated || opLocked) return;

    const targetOperationId = canSeeAllOperations ? activeOperationId : operationId;
    let cancelled = false;

    const loadBaselineCount = async () => {
      if (isAdmin) {
        if (!targetOperationId) {
          setUnfilteredTotalClients(0);
          return;
        }

        if (shouldReduceLoad) {
          return;
        }

        const { count, error } = await clientsService.getCount(targetOperationId);

        if (cancelled) return;

        if (error) {
          console.error("Error cargando total base de clientes:", error);
          return;
        }

        setUnfilteredTotalClients(count);
        return;
      }

      if (!user?.id) {
        setUnfilteredTotalClients(0);
        return;
      }

      if (shouldReduceLoad) {
        return;
      }

      const { count, error } = await agentAssignments.getAssignedClientsCount(
        user.id,
        targetOperationId,
      );

      if (cancelled) return;

      if (error) {
        console.error("Error cargando total base de clientes asignados:", error);
        return;
      }

      setUnfilteredTotalClients(count);
    };

    void loadBaselineCount();

    return () => {
      cancelled = true;
    };
  }, [
    activeOperationId,
    canSeeAllOperations,
    isAdmin,
    opLocked,
    operationId,
    shouldReduceLoad,
    user?.id,
    viewHydrated,
  ]);

  useEffect(() => {
    if (opLocked) {
      setCampaignFilterOptions([]);
      setAgentFilterOptions([]);
      return;
    }

    if (shouldReduceLoad) {
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
      ] = await Promise.all([
        campaigns.list(targetOperationId),
        isAdmin
          ? agents.getAll()
          : Promise.resolve({ data: [] as never[], error: null }),
      ]);

      if (cancelled) return;

      setCampaignFilterOptions(
        (campaignsData ?? [])
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
  }, [
    activeOperationId,
    canSeeAllOperations,
    isAdmin,
    opLocked,
    operationId,
    shouldReduceLoad,
    user?.id,
  ]);

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
    if (shouldReduceLoad) return;

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const shouldRefreshOnFocus = isAdmin && !showEditModal && !showEmailModal;

    if (!shouldRefreshOnFocus) return;

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastClientsLoadAtRef.current < CLIENTS_FOCUS_REFRESH_STALE_MS) {
        return;
      }

      void refreshClientsPreservingScroll();
    };

    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", maybeRefresh);

    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", maybeRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    showEditModal,
    showEmailModal,
    activeOperationId,
    operationId,
    operationReady,
    shouldReduceLoad,
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

  const handleToggleColumn = (column: ClientTableColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== column);
      }

      const next = [...current, column];
      return CLIENT_TABLE_DEFAULT_VISIBLE_COLUMNS.filter((key) =>
        next.includes(key),
      ).concat(
        next.filter((key) => !CLIENT_TABLE_DEFAULT_VISIBLE_COLUMNS.includes(key)),
      ) as ClientTableColumnKey[];
    });
  };

  const handleSortChange = (nextSortKey: ClientTableSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const handleTableTextFilterChange = (
    filterKey: ClientTableTextFilterKey,
    value: string,
  ) => {
    setTableTextFilters((current) => ({
      ...current,
      [filterKey]: value,
    }));
  };

  const resetTableTextFilters = () => {
    setTableTextFilters(CLIENT_TABLE_DEFAULT_TEXT_FILTERS);
  };

  const resetColumnFilters = () => {
    setStatusFilter("all");
    setCountryFilter("");
    setTableTextFilters(CLIENT_TABLE_DEFAULT_TEXT_FILTERS);
  };

  const toggleColumnFiltersVisibility = () => {
    setShowColumnFilters((current) => !current);
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
  const isSearchActive = trimmedSearchQuery.length >= CLIENTS_MIN_SEARCH_LENGTH;
  const isStatusFilterActive = statusFilter !== "all";
  const isCampaignFilterActive = campaignFilter !== "all";
  const isAgentFilterActive = assignedAgentFilter !== "all";
  const trimmedCountryFilter = countryFilter.trim();
  const isCountryFilterActive = trimmedCountryFilter.length > 0;
  const isBalanceRangeFilterActive = balanceRangeFilter !== "all";
  const isDailyManagementFilterActive = dailyManagementFilter !== "all";
  const activeFilterSummary = [
    isSearchActive ? trimmedSearchQuery : null,
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
    isCountryFilterActive ? `Pais: ${trimmedCountryFilter}` : null,
    debouncedTableTextFilters.first_name.trim()
      ? `Nombre: ${debouncedTableTextFilters.first_name.trim()}`
      : null,
    debouncedTableTextFilters.last_name.trim()
      ? `Apellido: ${debouncedTableTextFilters.last_name.trim()}`
      : null,
    debouncedTableTextFilters.email.trim()
      ? `Email: ${debouncedTableTextFilters.email.trim()}`
      : null,
    debouncedTableTextFilters.phone_number.trim()
      ? `Telefono: ${debouncedTableTextFilters.phone_number.trim()}`
      : null,
    debouncedTableTextFilters.source.trim()
      ? `Empresa: ${debouncedTableTextFilters.source.trim()}`
      : null,
    debouncedTableTextFilters.serial.trim()
      ? `Serie: ${debouncedTableTextFilters.serial.trim()}`
      : null,
    isBalanceRangeFilterActive
      ? getClientBalanceRangeLabel(balanceRangeFilter)
      : null,
    dailyManagementFilter === "commented_today"
      ? "Gestionados hoy"
      : dailyManagementFilter === "pending_today"
        ? "Pendientes de hoy"
        : null,
  ].filter(Boolean) as string[];
  const hasActiveFilters = activeFilterSummary.length > 0;
  const hasActiveColumnFilters =
    statusFilter !== "all" ||
    countryFilter.trim().length > 0 ||
    Object.values(tableTextFilters).some((value) => value.trim().length > 0);
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
    degradedMode: shouldReduceLoad,
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
    isSearchPendingMinLength,
    hasActiveFilters,
    hasActiveColumnFilters,
    isStatusFilterActive,
    isCampaignFilterActive,
    isAgentFilterActive,
    isCountryFilterActive,
    isBalanceRangeFilterActive,
    isDailyManagementFilterActive,
    activeFilterSummary,
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
    searchMinLength: CLIENTS_MIN_SEARCH_LENGTH,
    unassignedAgentFilter: UNASSIGNED_AGENT_FILTER,
  };
}
