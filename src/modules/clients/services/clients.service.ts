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
};

export const CLIENT_LIST_SELECT = `
  id,
  tenant_id,
  operation_id,
  campaign_id,
  assigned_to,
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
  agent:agents!clients_last_comment_agent_fkey(name)
`;

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
    nullsFirst: ascending,
  });
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

    let request = supabase
      .from("clients")
      .select(CLIENT_LIST_SELECT, { count: "exact" })
      .or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,serial.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%,source.ilike.%${q}%`,
      );

    if (params?.agentId) {
      request = request.eq("assigned_to", params.agentId);
    }

    if (params?.assignedAgentId) {
      request =
        params.assignedAgentId === UNASSIGNED_AGENT_FILTER
          ? request.is("assigned_to", null)
          : params.assignedAgentId === ASSIGNED_ONLY_FILTER
            ? request.not("assigned_to", "is", null)
          : request.eq("assigned_to", params.assignedAgentId);
    }

    request = applyClientListFilters(request, params);

    const { data, error, count } = await applyClientListOrder(
      request,
      params?.orderBy,
      params?.orderDirection,
    ).range(from, to);

    return {
      data: (data ?? []) as Client[],
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

    if (params?.assignedAgentId) {
      request =
        params.assignedAgentId === UNASSIGNED_AGENT_FILTER
          ? request.is("assigned_to", null)
          : params.assignedAgentId === ASSIGNED_ONLY_FILTER
            ? request.not("assigned_to", "is", null)
          : request.eq("assigned_to", params.assignedAgentId);
    }

    request = applyClientListFilters(request, params);

    const { data, error, count } = await applyClientListOrder(
      request,
      params?.orderBy,
      params?.orderDirection,
    ).range(from, to);

    return {
      data: (data ?? []) as Client[],
      error,
      count: count ?? 0,
    };
  },

  getById: async (id: string, operationId?: string | null) => {
    let request = supabase.from("clients").select("*").eq("id", id);

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    const { data, error } = await request.single();

    return { data: (data ?? null) as Client | null, error };
  },

  create: async (
    clientData: Omit<Client, "id" | "created_at" | "updated_at">,
  ) => {
    const { data, error } = await supabase
      .from("clients")
      .insert(clientData)
      .select()
      .single();

    return { data: (data ?? null) as Client | null, error };
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

    return { data: (data ?? null) as Client | null, error };
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
