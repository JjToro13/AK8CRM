import { supabase } from "../../../integrations/supabase/client";
import type { Agent } from "../../../shared/types/crm";
import { appEnv, buildSupabaseFunctionUrl } from "../../../config/env";

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

  resetPassword: async (params: { id: string; password: string }) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { error: sessionError };
    }

    const accessToken = session?.access_token ?? "";
    if (!accessToken) {
      return {
        error: new Error(
          "No hay una sesion activa valida para actualizar contrasenas.",
        ),
      };
    }

    const response = await fetch(buildSupabaseFunctionUrl("reset-agent-password"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: appEnv.supabase.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: params.id,
        password: params.password,
      }),
    });

    const rawText = await response.text();
    let payload: { error?: string; details?: string; message?: string } | null = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText) as {
          error?: string;
          details?: string;
          message?: string;
        };
      } catch {
        payload = { error: rawText };
      }
    }

    if (!response.ok) {
      const details = payload?.details ? ` - ${payload.details}` : "";
      const message =
        payload?.error ||
        payload?.message ||
        `La funcion reset-agent-password devolvio HTTP ${response.status}.`;

      return { error: new Error(`${message}${details}`) };
    }

    if (payload?.error) {
      const details = payload.details ? ` - ${payload.details}` : "";
      return { error: new Error(`${payload.error}${details}`) };
    }

    return { error: null };
  },

  remove: async (params: {
    id: string;
    scheduledCallsAction?: "block" | "delete" | "migrate";
    migrateToAgentId?: string | null;
  }) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { error: sessionError };
    }

    const accessToken = session?.access_token ?? "";
    if (!accessToken) {
      return { error: new Error("No hay una sesion activa valida para eliminar usuarios.") };
    }

    const response = await fetch(buildSupabaseFunctionUrl("delete-agent"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: appEnv.supabase.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: params.id,
        scheduled_calls_action: params.scheduledCallsAction ?? "block",
        migrate_to_agent_id: params.migrateToAgentId ?? null,
      }),
    });

    const rawText = await response.text();
    let payload: { error?: string; details?: string; message?: string } | null = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText) as {
          error?: string;
          details?: string;
          message?: string;
        };
      } catch {
        payload = { error: rawText };
      }
    }

    if (!response.ok) {
      const details = payload?.details ? ` - ${payload.details}` : "";
      const message =
        payload?.error ||
        payload?.message ||
        `La funcion delete-agent devolvio HTTP ${response.status}.`;

      return { error: new Error(`${message}${details}`) };
    }

    if (payload?.error) {
      const details = payload.details ? ` - ${payload.details}` : "";
      return { error: new Error(`${payload.error}${details}`) };
    }

    return { error: null };
  },

  getDeletePreview: async (id: string) => {
    const { data, error } = await supabase.rpc("get_agent_delete_preview", {
      p_id: id,
    });

    const row = Array.isArray(data) ? data[0] : data;
    return {
      data: (row ?? null) as {
        agent_id: string;
        operation_id: string | null;
        scheduled_calls_count: number;
        blocking_comments_count: number;
        blocking_assignments_count: number;
      } | null,
      error,
    };
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
