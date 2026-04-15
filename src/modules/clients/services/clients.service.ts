import { supabase } from "../../../integrations/supabase/client";
import type { Client } from "../../../shared/types/crm";

const UNASSIGNED_AGENT_FILTER = "__unassigned__";

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
      operationId?: string | null;
      statusCode?: string | null;
      campaignId?: string | null;
      assignedAgentId?: string | null;
      page?: number;
      pageSize?: number;
    },
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

    if (params?.operationId) {
      request = request.eq("operation_id", params.operationId);
    }

    if (params?.statusCode) {
      request = request.eq("status_code", params.statusCode);
    }

    if (params?.campaignId) {
      request = request.eq("campaign_id", params.campaignId);
    }

    if (params?.assignedAgentId) {
      request =
        params.assignedAgentId === UNASSIGNED_AGENT_FILTER
          ? request.is("assigned_to", null)
          : request.eq("assigned_to", params.assignedAgentId);
    }

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
    operationId?: string | null,
    page: number = 1,
    pageSize: number = 15,
    statusCode?: string | null,
    campaignId?: string | null,
    assignedAgentId?: string | null,
  ) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = supabase
      .from("clients")
      .select(CLIENT_LIST_SELECT, { count: "exact" });

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    if (statusCode) {
      request = request.eq("status_code", statusCode);
    }

    if (campaignId) {
      request = request.eq("campaign_id", campaignId);
    }

    if (assignedAgentId) {
      request =
        assignedAgentId === UNASSIGNED_AGENT_FILTER
          ? request.is("assigned_to", null)
          : request.eq("assigned_to", assignedAgentId);
    }

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
