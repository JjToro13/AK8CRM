import { supabase } from "../../../integrations/supabase/client";
import type {
  CampaignMetadataRow,
  CampaignStatsRow,
} from "../types/campaign.types";

export const campaigns = {
  list: async (selectedOperationId?: string | null) => {
    let request = supabase
      .from("campaigns")
      .select(
        "id, prefix, display_name, created_at, updated_at, imported_at, is_locked, locked_at, locked_by, operation_id, tenant_id",
      )
      .order("prefix", { ascending: true });

    if (selectedOperationId) {
      request = request.eq("operation_id", selectedOperationId);
    }

    const { data, error } = await request;

    return {
      data: (data ?? []) as CampaignMetadataRow[],
      error,
    };
  },

  getStats: async (selectedOperationId?: string | null) => {
    const { data, error } = await supabase.rpc("get_campaign_stats_v2", {
      p_operation_id: selectedOperationId ?? null,
    });

    return {
      data: (Array.isArray(data) ? data : []) as CampaignStatsRow[],
      error,
    };
  },

  deleteClientsByCampaign: async (
    campaignId: string,
    selectedOperationId?: string | null,
  ) => {
    let request = supabase
      .from("clients")
      .delete({ count: "exact" })
      .eq("campaign_id", campaignId);

    if (selectedOperationId) {
      request = request.eq("operation_id", selectedOperationId);
    }

    const { error, count } = await request;

    return {
      error,
      deletedCount: count ?? 0,
    };
  },

  deleteCampaignRow: async (
    campaignId: string,
    selectedOperationId?: string | null,
  ) => {
    let request = supabase.from("campaigns").delete().eq("id", campaignId);

    if (selectedOperationId) {
      request = request.eq("operation_id", selectedOperationId);
    }

    const { error } = await request;
    return { error };
  },

  updateLock: async (
    campaignId: string,
    selectedOperationId: string | null | undefined,
    payload: {
      is_locked: boolean;
      locked_at: string | null;
      locked_by: string | null;
      updated_at: string;
    },
  ) => {
    let request = supabase
      .from("campaigns")
      .update(payload)
      .eq("id", campaignId);

    if (selectedOperationId) {
      request = request.eq("operation_id", selectedOperationId);
    }

    const { error } = await request;

    return { error };
  },

  updateName: async (
    campaignId: string,
    selectedOperationId: string | null | undefined,
    displayName: string | null,
  ) => {
    let request = supabase
      .from("campaigns")
      .update({
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (selectedOperationId) {
      request = request.eq("operation_id", selectedOperationId);
    }

    const { error } = await request;

    return { error };
  },

  moveClientsToCampaign: async (params: {
    clientIds: string[];
    targetCampaignId: string;
    reason?: string | null;
    notes?: string | null;
  }) => {
    const { data, error } = await supabase.rpc("move_clients_to_campaign", {
      p_client_ids: params.clientIds,
      p_target_campaign_id: params.targetCampaignId,
      p_reason: params.reason ?? null,
      p_notes: params.notes ?? null,
    });

    const movedCount = Array.isArray(data)
      ? Number((data[0] as { moved_count?: number } | undefined)?.moved_count ?? 0)
      : 0;

    return { data, error, movedCount };
  },
};
