import { supabase } from "../../../integrations/supabase/client";
import type {
  Operation2faEnrollment,
  OperationDeletePreview,
  OperationDeleteResult,
  OperationSecuritySettings,
  TenantClientStatusDefinition,
  TenantAdminSettings,
} from "../types/admin.types";

export const admin = {
  getOperationSettings: async (operationId: string) => {
    const { data, error } = await supabase.rpc("get_operation_admin_settings", {
      p_operation_id: operationId,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: (row ?? null) as TenantAdminSettings | null,
      error,
    };
  },

  updateClientPrivacy: async (params: {
    operationId: string;
    maskPhoneNumbers: boolean;
    maskEmails: boolean;
  }) => {
    const { data, error } = await supabase.rpc("update_operation_client_privacy", {
      p_operation_id: params.operationId,
      p_mask_phone_numbers: params.maskPhoneNumbers,
      p_mask_emails: params.maskEmails,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: (row ?? null) as Pick<
        TenantAdminSettings,
        "tenant_id" | "client_phone_masked" | "client_email_masked"
      > | null,
      error,
    };
  },

  createOperation: async (params: {
    tenantId: string;
    name: string;
    slug: string;
  }) => {
    const { data, error } = await supabase.rpc("create_operation_for_tenant", {
      p_tenant_id: params.tenantId,
      p_name: params.name,
      p_slug: params.slug,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: row as {
        id: string;
        slug: string;
        name: string;
        tenant_id: string;
      } | null,
      error,
    };
  },

  getOperationSecuritySettings: async (operationId: string) => {
    const { data, error } = await supabase.functions.invoke("operation-2fa", {
      body: {
        action: "get_settings",
        operation_id: operationId,
      },
    });

    return {
      data: (data?.data ?? null) as OperationSecuritySettings | null,
      error,
    };
  },

  startOperation2faEnrollment: async (operationId: string) => {
    const { data, error } = await supabase.functions.invoke("operation-2fa", {
      body: {
        action: "start_enrollment",
        operation_id: operationId,
      },
    });

    return {
      data: (data?.data ?? null) as Operation2faEnrollment | null,
      error,
    };
  },

  confirmOperation2faEnrollment: async (params: {
    operationId: string;
    setupId: string;
    code: string;
  }) => {
    const { data, error } = await supabase.functions.invoke("operation-2fa", {
      body: {
        action: "confirm_enrollment",
        operation_id: params.operationId,
        setup_id: params.setupId,
        code: params.code,
      },
    });

    return {
      data: data?.data as
        | { totp_enabled: boolean; totp_rotated_at: string | null }
        | null,
      error,
    };
  },

  disableOperation2fa: async (operationId: string) => {
    const { data, error } = await supabase.functions.invoke("operation-2fa", {
      body: {
        action: "disable",
        operation_id: operationId,
      },
    });

    return {
      data: data?.data as { totp_enabled: boolean } | null,
      error,
    };
  },

  getOperationDeletePreview: async (operationId: string) => {
    const { data, error } = await supabase.rpc("get_operation_delete_preview", {
      p_operation_id: operationId,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: (row ?? null) as OperationDeletePreview | null,
      error,
    };
  },

  deleteOperation: async (params: {
    operationId: string;
    confirmation: string;
  }) => {
    const { data, error } = await supabase.rpc("delete_operation_for_tenant", {
      p_operation_id: params.operationId,
      p_confirmation: params.confirmation,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: (row ?? null) as OperationDeleteResult | null,
      error,
    };
  },

  listTenantClientStatuses: async (tenantId: string | null) => {
    const { data, error } = await supabase.rpc("list_client_status_definitions", {
      p_tenant_id: tenantId,
    });

    return {
      data: (Array.isArray(data) ? data : []) as TenantClientStatusDefinition[],
      error,
    };
  },

  createTenantClientStatus: async (params: {
    tenantId: string;
    code: string;
    label: string;
    description?: string;
    colorToken: string;
  }) => {
    const { data, error } = await supabase.rpc("create_tenant_client_status", {
      p_tenant_id: params.tenantId,
      p_code: params.code,
      p_label: params.label,
      p_short_label: params.code,
      p_description: params.description ?? "",
      p_color_token: params.colorToken,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: (row ?? null) as TenantClientStatusDefinition | null,
      error,
    };
  },
};
