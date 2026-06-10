export type CampaignMetadataRow = {
  id: string;
  prefix: string;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  imported_at?: string | null;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  deletion_requested_at?: string | null;
  deletion_available_at?: string | null;
  deletion_requested_by?: string | null;
  deletion_reason?: string | null;
  operation_id?: string | null;
  tenant_id?: string | null;
};

export type CampaignStatsRow = {
  campaign_id: string;
  prefix: string;
  total_clients: number;
  assigned_clients: number;
  available_clients: number;
  min_serial: string | null;
  max_serial: string | null;
};

export type CampaignViewRow = {
  id: string;
  prefix: string;
  name: string;
  total: number;
  assigned: number;
  available: number;
  minSerial: string | null;
  maxSerial: string | null;
  importedAt: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  deletionRequestedAt: string | null;
  deletionAvailableAt: string | null;
  deletionRequestedBy: string | null;
  deletionReason: string | null;
};

export type CampaignTotals = {
  totalClients: number;
  totalAssigned: number;
  totalAvailable: number;
};

export type CampaignExportOption = {
  id: string;
  prefix: string;
  name: string;
  total: number;
  available: number;
};

export type CampaignManagementProps = {
  selectedOperationId?: string | null;
};

export type CampaignSortKey =
  | "prefix"
  | "name"
  | "total"
  | "assigned"
  | "available"
  | "importedAt"
  | "isLocked";

export type CampaignSortDirection = "asc" | "desc";
