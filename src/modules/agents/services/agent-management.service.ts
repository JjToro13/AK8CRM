import type { Agent } from "../../../lib/supabase";
import { supabase } from "../../../integrations/supabase/client";
import type {
  AgentCountsMap,
  AgentCountRow,
  AvailableCampaignRow,
} from "../types/agent-management.types";

export const agentManagement = {
  getAssignedCounts: async (
    operationalAgents: Agent[],
    visibleOperationIds: string[],
  ) => {
    const countsMap: AgentCountsMap = {};
    const scopedOperationIds = Array.from(new Set(visibleOperationIds.filter(Boolean)));

    if (scopedOperationIds.length === 0) {
      return { data: countsMap, error: null };
    }

    const { data, error } = await supabase.rpc("get_agent_assigned_counts");

    if (!error && Array.isArray(data)) {
      (data as AgentCountRow[]).forEach((row) => {
        if (row?.agent_id) {
          countsMap[row.agent_id] = Number(row.assigned_count || 0);
        }
      });

      return { data: countsMap, error: null };
    }

    if (error) {
      console.warn(
        "RPC get_agent_assigned_counts fallo. Se usa fallback por agente.",
        error,
      );
    }

    for (const agent of operationalAgents) {
      const { count, error: countError } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", agent.id)
        .in("operation_id", scopedOperationIds);

      if (countError) {
        console.error("Error contando asignados:", agent.id, countError);
        continue;
      }

      countsMap[agent.id] = Number(count || 0);
    }

    return { data: countsMap, error };
  },

  getAvailableCampaigns: async (visibleOperationIds: string[]) => {
    const scopedOperationIds = Array.from(new Set(visibleOperationIds.filter(Boolean)));

    const selectedOperationId = scopedOperationIds[0] ?? null;

    if (!selectedOperationId) {
      return {
        data: [] as AvailableCampaignRow[],
        error: null,
      };
    }

    const { data, error } = await supabase.rpc("get_available_campaigns_v2", {
      p_operation_id: selectedOperationId,
    });

    if (error || !Array.isArray(data)) {
      return {
        data: [] as AvailableCampaignRow[],
        error,
      };
    }

    const mappedData = (data as Array<{
      campaign_id?: string;
      prefix?: string;
      display_name?: string | null;
      available?: number | string | null;
    }>)
      .map((row) => ({
        id: String(row.campaign_id ?? ""),
        prefix: String(row.prefix ?? ""),
        display_name: row.display_name ?? null,
        available: Number(row.available ?? 0),
      }))
      .filter((row) => row.id && row.prefix && row.available > 0)
      .sort((left, right) => left.prefix.localeCompare(right.prefix));

    return {
      data: mappedData,
      error: null,
    };
  },
};
