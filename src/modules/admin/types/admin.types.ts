import type { Operation, VisibleTenant } from "../../dashboard/types/dashboard.types";

export type TenantAdminSettings = {
  operation_id: string;
  operation_name: string;
  operation_slug: string;
  tenant_id: string;
  client_phone_masked: boolean;
  client_email_masked: boolean;
};

export type AdminTenantOption = VisibleTenant;

export type AdminOperationOption = Operation;

export type OperationSecuritySettings = {
  operation_id: string;
  totp_enabled: boolean;
  totp_issuer: string;
  totp_label: string | null;
  totp_rotated_at: string | null;
  has_pending_setup: boolean;
};

export type Operation2faEnrollment = {
  setup_id: string;
  secret: string;
  otpauth_uri: string;
  expires_at: string;
};

export type OperationDeletePreview = {
  operation_id: string;
  operation_name: string;
  operation_slug: string;
  tenant_id: string;
  campaign_count: number;
  client_count: number;
  scheduled_call_count: number;
  assigned_agent_count: number;
  active_agent_count: number;
  requires_extended_confirmation: boolean;
  confirmation_phrase: string;
};

export type OperationDeleteResult = {
  deleted_operation: boolean;
  deleted_campaigns: number;
  deleted_clients: number;
  deleted_scheduled_calls: number;
  deleted_movements: number;
  cleared_active_agents: number;
};
