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
        "id, prefix, display_name, created_at, updated_at, imported_at, is_locked, locked_at, locked_by, deletion_requested_at, deletion_available_at, deletion_requested_by, deletion_reason, operation_id, tenant_id",
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

  stageDeletion: async (
    campaignId: string,
    selectedOperationId: string | null | undefined,
    params: {
      requestedBy: string | null;
      reason?: string | null;
      requestedAt: string;
      availableAt: string;
    },
  ) => {
    let campaignRequest = supabase
      .from("campaigns")
      .update({
        is_locked: true,
        locked_at: params.requestedAt,
        locked_by: params.requestedBy,
        deletion_requested_at: params.requestedAt,
        deletion_available_at: params.availableAt,
        deletion_requested_by: params.requestedBy,
        deletion_reason: params.reason ?? "soft_delete_grace_period",
        updated_at: params.requestedAt,
      })
      .eq("id", campaignId);

    let clientsRequest = supabase.from("clients").update(
      {
        assigned_to: null,
        assigned_at: null,
        assigned_by: null,
        quarantined_until: params.availableAt,
        quarantine_reason: params.reason ?? "campaign_deletion_grace_period",
        updated_at: params.requestedAt,
      },
      { count: "exact" },
    ).eq("campaign_id", campaignId);

    if (selectedOperationId) {
      campaignRequest = campaignRequest.eq("operation_id", selectedOperationId);
      clientsRequest = clientsRequest.eq("operation_id", selectedOperationId);
    }

    const { error: campaignError } = await campaignRequest;
    if (campaignError) {
      return { error: campaignError };
    }

    const { error: clientsError, count } = await clientsRequest;

    return { error: clientsError, affectedClients: count ?? 0 };
  },

  restoreDeletion: async (
    campaignId: string,
    selectedOperationId?: string | null,
  ) => {
    let campaignRequest = supabase
      .from("campaigns")
      .update({
        deletion_requested_at: null,
        deletion_available_at: null,
        deletion_requested_by: null,
        deletion_reason: null,
        is_locked: false,
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    let clientsRequest = supabase
      .from("clients")
      .update({
        quarantined_until: null,
        quarantine_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("campaign_id", campaignId);

    if (selectedOperationId) {
      campaignRequest = campaignRequest.eq("operation_id", selectedOperationId);
      clientsRequest = clientsRequest.eq("operation_id", selectedOperationId);
    }

    const { error: campaignError } = await campaignRequest;
    if (campaignError) return { error: campaignError };

    const { error: clientsError, count } = await clientsRequest;
    return { error: clientsError, restoredClients: count ?? 0 };
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
