import { supabase } from "../../../integrations/supabase/client";
import type { AgentAssignment } from "../../../shared/types/crm";
import { agentNameMap } from "../../../shared/services/agent-name-map";
import { CLIENT_LIST_SELECT } from "../../clients/services/clients.service";

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
