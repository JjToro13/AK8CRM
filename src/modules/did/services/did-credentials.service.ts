import { supabase } from "../../../integrations/supabase/client";
import { agentNameMap } from "../../../shared/services/agent-name-map";

export const didCredentials = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from("agent_did_credentials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error };
      }

      const rows = (data ?? []) as any[];
      const ids = Array.from(
        new Set(rows.map((row) => row.agent_id).filter(Boolean)),
      );
      const map = await agentNameMap(ids);

      const enriched = rows.map((row) => ({
        ...row,
        agent: { id: row.agent_id, name: map.get(row.agent_id) ?? row.agent_id },
      }));

      return { data: enriched, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  getByAgentId: async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from("agent_did_credentials")
        .select("*")
        .eq("agent_id", agentId)
        .eq("is_active", true)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  upsert: async (credentials: {
    agent_id: string;
    extension_number: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from("agent_did_credentials")
        .upsert(
          {
            ...credentials,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "agent_id" },
        )
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  delete: async (agentId: string) => {
    try {
      const { error } = await supabase
        .from("agent_did_credentials")
        .delete()
        .eq("agent_id", agentId);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  deactivate: async (agentId: string) => {
    try {
      const { error } = await supabase
        .from("agent_did_credentials")
        .update({ is_active: false })
        .eq("agent_id", agentId);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  testConnection: async (extensionNumber: string) => {
    try {
      const extensionNum = parseInt(extensionNumber, 10);

      if (Number.isNaN(extensionNum) || extensionNum < 100 || extensionNum > 999) {
        return {
          success: false,
          error: "El numero de extension debe ser un numero entre 100 y 999",
        };
      }

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
};
