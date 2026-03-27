import { supabase } from "../../../integrations/supabase/client";
import type { Operation, VisibleTenant } from "../types/dashboard.types";
import type { TenantBrandingSettings } from "../../../shared/branding/tenant-branding";

type OperationBrandingContext = {
  operation: Operation | null;
  tenantSettings: TenantBrandingSettings | null;
};

export const dashboard = {
  getVisibleTenants: async () => {
    const { data, error } = await supabase.rpc("get_visible_tenants");

    return {
      data: (Array.isArray(data) ? data : []) as VisibleTenant[],
      error,
    };
  },

  getOperations: async () => {
    const { data, error } = await supabase.rpc("get_visible_operations", {
      p_tenant_id: null,
    });

    return {
      data: (Array.isArray(data) ? data : []) as Operation[],
      error,
    };
  },

  getOperationsByTenant: async (tenantId?: string | null) => {
    const { data, error } = await supabase.rpc("get_visible_operations", {
      p_tenant_id: tenantId ?? null,
    });

    return {
      data: (Array.isArray(data) ? data : []) as Operation[],
      error,
    };
  },

  getOperationById: async (operationId: string) => {
    const { data, error } = await supabase
      .from("operations")
      .select("id, slug, name, tenant_id")
      .eq("id", operationId)
      .maybeSingle();

    return {
      data: (data ?? null) as Operation | null,
      error,
    };
  },

  getOperationBrandingContextById: async (operationId: string) => {
    const operationResult = await dashboard.getOperationById(operationId);

    if (operationResult.error || !operationResult.data?.tenant_id) {
      return {
        data: {
          operation: operationResult.data,
          tenantSettings: null,
        } as OperationBrandingContext,
        error: operationResult.error,
      };
    }

    const { data, error } = await supabase
      .from("tenant_settings")
      .select("product_name, platform_label, brand_preset_id, extra")
      .eq("tenant_id", operationResult.data.tenant_id)
      .maybeSingle();

    return {
      data: {
        operation: operationResult.data,
        tenantSettings: (data ?? null) as TenantBrandingSettings | null,
      } as OperationBrandingContext,
      error,
    };
  },

  setActiveOperation: async (operationId: string) => {
    const { error } = await supabase.rpc("set_active_operation", {
      p_operation_id: operationId,
    });

    return { error };
  },
};
