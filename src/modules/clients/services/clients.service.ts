import { supabase } from "../../../integrations/supabase/client";
import type { ClientBalanceRangeFilter } from "../lib/clientFilters";
import {
  getTodayRangeForQueries,
  type ClientDailyManagementFilter,
} from "../lib/clientFollowUp";
import type {
  ClientTableSortDirection,
  ClientTableSortKey,
  ClientTableTextFilters,
} from "../components/clientTableColumns";
import type { Client } from "../../../shared/types/crm";

const UNASSIGNED_AGENT_FILTER = "__unassigned__";
const ASSIGNED_ONLY_FILTER = "__assigned_only__";

export type ClientListFilters = {
  operationId?: string | null;
  statusCode?: string | null;
  campaignId?: string | null;
  country?: string | null;
  balanceRange?: ClientBalanceRangeFilter | null;
  dailyManagement?: ClientDailyManagementFilter | null;
  textFilters?: Partial<ClientTableTextFilters> | null;
  orderBy?: ClientTableSortKey | null;
  orderDirection?: ClientTableSortDirection | null;
  includeQuarantined?: boolean;
};

export const CLIENT_LIST_SELECT = `
  id,
  tenant_id,
  operation_id,
  campaign_id,
  assigned_to,
  quarantined_until,
  quarantine_reason,
  serial,
  first_name,
  last_name,
  email,
  phone_number,
  country,
  source,
  funnel,
  deposit_amount,
  net_deposit,
  user_balance,
  investment_date,
  status_color,
  status_code,
  attempts,
  created_at,
  updated_at,
  last_comment,
  last_comment_at,
  last_comment_agent,
  comment_count,
  campaign:campaigns!clients_campaign_id_fkey(
    id,
    prefix,
    display_name
  ),
  agent:agents!clients_last_comment_agent_fkey(name)
`;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }

  return (value ?? null) as T | null;
}

function normalizeClient(value: any): Client | null {
  if (!value) return null;

  return {
    ...value,
    campaign: firstRelation(value.campaign),
    agent: firstRelation(value.agent),
  } as Client;
}

function normalizeClients(values: any): Client[] {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeClient).filter(Boolean) as Client[];
}

function applyClientBalanceRangeFilter(
  request: any,
  balanceRange?: ClientBalanceRangeFilter | null,
) {
  switch (balanceRange) {
    case "negative":
      return request.lt("user_balance", 0);
    case "zero_to_999":
      return request.gte("user_balance", 0).lt("user_balance", 1000);
    case "1000_to_4999":
      return request.gte("user_balance", 1000).lt("user_balance", 5000);
    case "5000_plus":
      return request.gte("user_balance", 5000);
    default:
      return request;
  }
}

export function applyClientListFilters(
  request: any,
  filters?: ClientListFilters,
) {
  let nextRequest = request;
  const countryQuery = filters?.country?.trim();
  const firstNameQuery = filters?.textFilters?.first_name?.trim();
  const lastNameQuery = filters?.textFilters?.last_name?.trim();
  const emailQuery = filters?.textFilters?.email?.trim();
  const phoneQuery = filters?.textFilters?.phone_number?.trim();
  const sourceQuery = filters?.textFilters?.source?.trim();
  const serialQuery = filters?.textFilters?.serial?.trim();
  const { startIso, endIso } = getTodayRangeForQueries();
  const nowIso = new Date().toISOString();

  if (!filters?.includeQuarantined) {
    nextRequest = nextRequest.or(
      `quarantined_until.is.null,quarantined_until.lt.${nowIso}`,
    );
  }

  if (filters?.operationId) {
    nextRequest = nextRequest.eq("operation_id", filters.operationId);
  }

  if (filters?.statusCode) {
    nextRequest = nextRequest.eq("status_code", filters.statusCode);
  }

  if (filters?.campaignId) {
    nextRequest = nextRequest.eq("campaign_id", filters.campaignId);
  }

  if (countryQuery) {
    nextRequest = nextRequest.ilike("country", `%${countryQuery}%`);
  }

  if (firstNameQuery) {
    nextRequest = nextRequest.ilike("first_name", `%${firstNameQuery}%`);
  }

  if (lastNameQuery) {
    nextRequest = nextRequest.ilike("last_name", `%${lastNameQuery}%`);
  }

  if (emailQuery) {
    nextRequest = nextRequest.ilike("email", `%${emailQuery}%`);
  }

  if (phoneQuery) {
    nextRequest = nextRequest.ilike("phone_number", `%${phoneQuery}%`);
  }

  if (sourceQuery) {
    nextRequest = nextRequest.ilike("source", `%${sourceQuery}%`);
  }

  if (serialQuery) {
    nextRequest = nextRequest.ilike("serial", `%${serialQuery}%`);
  }

  if (filters?.dailyManagement === "commented_today") {
    nextRequest = nextRequest
      .gte("last_comment_at", startIso)
      .lt("last_comment_at", endIso);
  }

  if (filters?.dailyManagement === "pending_today") {
    nextRequest = nextRequest.or(`last_comment_at.is.null,last_comment_at.lt.${startIso}`);
  }

  return applyClientBalanceRangeFilter(nextRequest, filters?.balanceRange);
}

function applyClientListOrder(
  request: any,
  orderBy?: ClientTableSortKey | null,
  orderDirection?: ClientTableSortDirection | null,
) {
  const sortColumn = orderBy ?? "created_at";
  const ascending = (orderDirection ?? "desc") === "asc";

  return request.order(sortColumn, {
    ascending,
    nullsFirst: sortColumn === "last_comment_at" ? false : ascending,
  });
}

function applyAssignedAgentFilter(request: any, assignedAgentId?: string | null) {
  if (!assignedAgentId) return request;

  if (assignedAgentId === UNASSIGNED_AGENT_FILTER) {
    return request.is("assigned_to", null);
  }

  if (assignedAgentId === ASSIGNED_ONLY_FILTER) {
    return request.not("assigned_to", "is", null);
  }

  return request.eq("assigned_to", assignedAgentId);
}

function applyClientSearchQuery(request: any, query?: string | null) {
  const q = query?.trim();

  if (!q) return request;

  return request.or(
    `first_name.ilike.%${q}%,last_name.ilike.%${q}%,serial.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%,source.ilike.%${q}%`,
  );
}

export const clients = {
  getCount: async (operationId?: string | null) => {
    let request = supabase
      .from("clients")
      .select("id", { count: "exact", head: true });

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    const { error, count } = await request;

    return {
      error,
      count: count ?? 0,
    };
  },

  search: async (
    query: string,
    params?: {
      agentId?: string;
      assignedAgentId?: string | null;
      page?: number;
      pageSize?: number;
    } & ClientListFilters,
  ) => {
    const q = query.trim();

    if (!q) {
      return { data: [], error: null, count: 0 };
    }

    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = applyClientSearchQuery(
      supabase.from("clients").select(CLIENT_LIST_SELECT, { count: "exact" }),
      q,
    );

    if (params?.agentId) {
      request = request.eq("assigned_to", params.agentId);
    }

    request = applyAssignedAgentFilter(request, params?.assignedAgentId);

    request = applyClientListFilters(request, params);

    const { data, error, count } = await applyClientListOrder(
      request,
      params?.orderBy,
      params?.orderDirection,
    ).range(from, to);

    return {
      data: normalizeClients(data),
      error,
      count: count ?? 0,
    };
  },

  getAll: async (
    params?: {
      assignedAgentId?: string | null;
      page?: number;
      pageSize?: number;
    } & ClientListFilters,
  ) => {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = supabase
      .from("clients")
      .select(CLIENT_LIST_SELECT, { count: "exact" });

    request = applyAssignedAgentFilter(request, params?.assignedAgentId);

    request = applyClientListFilters(request, params);

    const { data, error, count } = await applyClientListOrder(
      request,
      params?.orderBy,
      params?.orderDirection,
    ).range(from, to);

    return {
      data: normalizeClients(data),
      error,
      count: count ?? 0,
    };
  },

  getAllMatching: async (
    params?: {
      searchQuery?: string | null;
      assignedAgentId?: string | null;
      pageSize?: number;
    } & ClientListFilters,
  ) => {
    const pageSize = params?.pageSize ?? 1000;
    const collected: Client[] = [];
    let from = 0;

    while (true) {
      let request = supabase.from("clients").select(CLIENT_LIST_SELECT);

      request = applyClientSearchQuery(request, params?.searchQuery);
      request = applyAssignedAgentFilter(request, params?.assignedAgentId);
      request = applyClientListFilters(request, params);

      const { data, error } = await applyClientListOrder(
        request,
        params?.orderBy,
        params?.orderDirection,
      ).range(from, from + pageSize - 1);

      if (error) {
        return { data: collected, error };
      }

      const batch = normalizeClients(data);
      collected.push(...batch);

      if (batch.length < pageSize) break;

      from += pageSize;
    }

    return { data: collected, error: null };
  },

  getById: async (id: string, operationId?: string | null) => {
    let request = supabase.from("clients").select("*").eq("id", id);

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    const { data, error } = await request.single();

    return { data: normalizeClient(data), error };
  },

  create: async (
    clientData: Omit<Client, "id" | "created_at" | "updated_at">,
  ) => {
    const { data, error } = await supabase
      .from("clients")
      .insert(clientData)
      .select()
      .single();

    return { data: normalizeClient(data), error };
  },

  update: async (
    id: string,
    updates: Partial<Client>,
    operationId?: string | null,
  ) => {
    let request = supabase.from("clients").update(updates).eq("id", id);

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    const { data, error } = await request.select().single();

    return { data: normalizeClient(data), error };
  },

  updateMany: async (
    ids: string[],
    updates: Partial<Client>,
    operationId?: string | null,
  ) => {
    const updated: Client[] = [];
    const batchSize = 500;

    for (let index = 0; index < ids.length; index += batchSize) {
      const batchIds = ids.slice(index, index + batchSize);
      let request = supabase.from("clients").update(updates).in("id", batchIds);

      if (operationId) {
        request = request.eq("operation_id", operationId);
      }

      const { data, error } = await request.select();

      if (error) {
        return { data: updated, error };
      }

      updated.push(...normalizeClients(data));
    }

    return { data: updated, error: null };
  },

  getAssignmentSnapshots: async (
    ids: string[],
    operationId?: string | null,
  ) => {
    const snapshots: Array<Pick<Client, "id" | "assigned_to">> = [];
    const batchSize = 500;

    for (let index = 0; index < ids.length; index += batchSize) {
      const batchIds = ids.slice(index, index + batchSize);
      let request = supabase
        .from("clients")
        .select("id, assigned_to")
        .in("id", batchIds);

      if (operationId) {
        request = request.eq("operation_id", operationId);
      }

      const { data, error } = await request;

      if (error) {
        return { data: snapshots, error };
      }

      snapshots.push(
        ...((data ?? []) as Array<Pick<Client, "id" | "assigned_to">>),
      );
    }

    return { data: snapshots, error: null };
  },

  delete: async (id: string, operationId?: string | null) => {
    let request = supabase.from("clients").delete().eq("id", id);

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    const { error } = await request;
    return { error };
  },
};
