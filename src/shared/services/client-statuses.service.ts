import { supabase } from "../../integrations/supabase/client";

export type ClientStatusDefinitionRow = {
  id: string;
  tenant_id: string | null;
  code: string;
  label: string;
  short_label: string;
  description: string;
  color_token: string;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  is_global: boolean;
};

export const clientStatuses = {
  list: async (tenantId?: string | null) => {
    const { data, error } = await supabase.rpc("list_client_status_definitions", {
      p_tenant_id: tenantId ?? null,
    });

    return {
      data: (Array.isArray(data) ? data : []) as ClientStatusDefinitionRow[],
      error,
    };
  },
};
