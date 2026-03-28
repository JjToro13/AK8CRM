import { supabase } from "../../../integrations/supabase/client";
import type { Agent } from "../../../shared/types/crm";

export const agents = {
  getAll: async () => {
    const { data, error } = await supabase.rpc("list_agents");
    return { data: (Array.isArray(data) ? data : []) as Agent[], error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.rpc("get_agent", { p_id: id });
    const row = Array.isArray(data) ? data[0] : data;
    return { data: (row ?? null) as Agent | null, error };
  },

  update: async (params: {
    id: string;
    name: string;
    role: "agent" | "loader" | "manager" | "owner" | "dev";
    is_active: boolean;
  }) => {
    const { error } = await supabase.rpc("upsert_agent", {
      p_id: params.id,
      p_name: params.name,
      p_role: params.role,
      p_is_active: params.is_active,
    });

    return { error };
  },

  remove: async (id: string) => {
    const { error } = await supabase.rpc("delete_agent", {
      p_id: id,
    });

    return { error };
  },

  create: async (params: {
    email: string;
    name: string;
    role?: "agent" | "loader" | "manager" | "owner" | "dev";
    password?: string;
    is_active?: boolean;
  }) => {
    const { data, error } = await supabase.functions.invoke("create-agent", {
      body: {
        email: params.email,
        name: params.name,
        role: params.role ?? "agent",
        password: params.password,
        is_active: params.is_active ?? true,
      },
    });

    return { data, error };
  },
};
