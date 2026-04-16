import { supabase } from "../../../integrations/supabase/client";
import type { ClientBalanceRangeFilter } from "../lib/clientFilters";
import type { Client } from "../../../shared/types/crm";

const UNASSIGNED_AGENT_FILTER = "__unassigned__";

export type ClientListFilters = {
  operationId?: string | null;
  statusCode?: string | null;
  campaignId?: string | null;
  country?: string | null;
  balanceRange?: ClientBalanceRangeFilter | null;
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

  return applyClientBalanceRangeFilter(nextRequest, filters?.balanceRange);
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
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,serial.ilike.%${q}%,email.ilike.%${q}%,source.ilike.%${q}%`,
      );

    if (params?.agentId) {
      request = request.eq("assigned_to", params.agentId);
    }

    if (params?.assignedAgentId) {
      request =
        params.assignedAgentId === UNASSIGNED_AGENT_FILTER
          ? request.is("assigned_to", null)
          : request.eq("assigned_to", params.assignedAgentId);
    }

    request = applyClientListFilters(request, params);

    const { data, error, count } = await request
      .order("created_at", { ascending: false })
      .range(from, to);

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
          : request.eq("assigned_to", params.assignedAgentId);
    }

    request = applyClientListFilters(request, params);

    const { data, error, count } = await request
      .order("created_at", { ascending: false })
      .range(from, to);

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
