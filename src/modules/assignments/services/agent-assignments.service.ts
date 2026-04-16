import { supabase } from "../../../integrations/supabase/client";
import type { AgentAssignment } from "../../../shared/types/crm";
import { agentNameMap } from "../../../shared/services/agent-name-map";
import {
  applyClientListFilters,
  CLIENT_LIST_SELECT,
  type ClientListFilters,
} from "../../clients/services/clients.service";

export const agentAssignments = {
  getAll: async () => {
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("agent_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignmentsError) {
        return { data: null, error: assignmentsError };
      }

      if (!assignments || assignments.length === 0) {
        return { data: [], error: null };
      }

      const ids = [
        ...new Set(
          assignments
            .map((assignment: any) => assignment.agent_id)
            .concat(assignments.map((assignment: any) => assignment.assigned_by)),
        ),
      ].filter(Boolean) as string[];

      const map = await agentNameMap(ids);

      const enriched = assignments.map((assignment: any) => ({
        ...assignment,
        agent: {
          id: assignment.agent_id,
          name: map.get(assignment.agent_id) ?? assignment.agent_id,
        },
        assigned_by_agent: {
          id: assignment.assigned_by,
          name: map.get(assignment.assigned_by) ?? assignment.assigned_by,
        },
      }));

      return { data: enriched, error: null };
    } catch (error) {
      console.error("Error en agentAssignments.getAll:", error);
      return { data: null, error: error as any };
    }
  },

  getByAgentId: async (agentId: string) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  create: async (
    assignmentData: Omit<AgentAssignment, "id" | "created_at" | "updated_at">,
  ) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .insert(assignmentData)
      .select("*")
      .single();

    return { data, error };
  },

  update: async (id: string, updates: Partial<AgentAssignment>) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    return { data, error };
  },

  deactivate: async (id: string) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .delete()
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  getAssignedClients: async (agentId: string) => {
    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_LIST_SELECT)
      .eq("assigned_to", agentId)
      .order("created_at", { ascending: false });

    return { data: data ?? [], error };
  },

  getAssignedClientsPage: async (
    agentId: string,
    params?: {
      searchQuery?: string;
      page?: number;
      pageSize?: number;
    } & ClientListFilters,
  ) => {
    const query = params?.searchQuery?.trim() ?? "";
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? 15);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = supabase
      .from("clients")
      .select(CLIENT_LIST_SELECT, { count: "exact" })
      .eq("assigned_to", agentId);

    if (query) {
      request = request.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,serial.ilike.%${query}%,email.ilike.%${query}%,source.ilike.%${query}%`,
      );
    }

    request = applyClientListFilters(request, params);

    const { data, error, count } = await request
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      data: data ?? [],
      error,
      count: count ?? 0,
    };
  },

  getAssignedClientsCount: async (
    agentId: string,
    operationId?: string | null,
  ) => {
    let request = supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", agentId);

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    const { count, error } = await request;

    return {
      count: count ?? 0,
      error,
    };
  },

  assignLeadsAtomic: async (params: {
    agent_id: string;
    count: number;
    assigned_by: string;
    campaign_id?: string | null;
    campaign_prefix?: string | null;
  }) => {
    const { data, error } = await supabase.rpc("assign_leads_atomic_v2", {
      p_agent_id: params.agent_id,
      p_count: params.count,
      p_assigned_by: params.assigned_by,
      p_campaign_id: params.campaign_id ?? null,
      p_campaign_prefix: params.campaign_prefix ?? null,
    });

    return { data, error };
  },

  assignLeadsFiltered: async (params: {
    agent_id: string;
    count: number;
    assigned_by: string;
    campaign_id?: string | null;
    campaign_prefix?: string | null;
    status_codes?: string[] | null;
    country?: string | null;
    balance_min?: number | null;
    balance_max?: number | null;
  }) => {
    const { data, error } = await supabase.rpc(
      "assign_leads_atomic_filtered_v1",
      {
        p_agent_id: params.agent_id,
        p_count: params.count,
        p_assigned_by: params.assigned_by,
        p_campaign_id: params.campaign_id ?? null,
        p_campaign_prefix: params.campaign_prefix ?? null,
        p_status_codes:
          params.status_codes && params.status_codes.length > 0
            ? params.status_codes
            : null,
        p_country: params.country?.trim() || null,
        p_balance_min: params.balance_min ?? null,
        p_balance_max: params.balance_max ?? null,
      },
    );

    return { data, error };
  },

  getAssignedClientsForManagement: async (agentId: string) => {
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("agent_assignments")
        .select(
          "id, client_serial_start, client_serial_end, created_at, assigned_by",
        )
        .eq("agent_id", agentId)
        .eq("is_active", true);

      if (assignmentsError) {
        return { data: null, error: assignmentsError };
      }

      if (!assignments || assignments.length === 0) {
        return { data: [], error: null };
      }

      const { data: allClients, error: clientsError } = await supabase
        .from("clients")
        .select("*");

      if (clientsError) {
        return { data: null, error: clientsError };
      }

      const assignedClients: any[] = [];

      for (const assignment of assignments as any[]) {
        const clientsInRange =
          (allClients ?? []).filter((client: any) => {
            const clientSerial = client.serial;
            return (
              clientSerial >= assignment.client_serial_start &&
              clientSerial <= assignment.client_serial_end
            );
          }) ?? [];

        for (const client of clientsInRange) {
          assignedClients.push({
            ...client,
            assignment_id: assignment.id,
            assigned_at: assignment.created_at,
            assigned_by: assignment.assigned_by,
          });
        }
      }

      return { data: assignedClients, error: null };
    } catch (error) {
      console.error("Error en getAssignedClientsForManagement:", error);
      return { data: null, error: error as any };
    }
  },
};
