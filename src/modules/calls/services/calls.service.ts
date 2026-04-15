import { supabase } from "../../../integrations/supabase/client";

export const calls = {
  start: async (clientId: string, agentId: string) => {
    const { data, error } = await supabase.functions.invoke("start-call", {
      body: { client_id: clientId, agent_id: agentId },
    });

    return { data, error };
  },

  getRecent: async (params?: {
    agentId?: string;
    operationId?: string | null;
    limit?: number;
  }) => {
    try {
      let request = supabase
        .from("calls")
        .select(
          `
            id,
            client_id,
            agent_id,
            start_time,
            end_time,
            status,
            duration,
            created_at,
            client:clients!inner(
              id,
              first_name,
              serial,
              status_color,
              status_code,
              operation_id
            ),
            agent:agents(
              id,
              name
            )
          `,
        )
        .order("created_at", { ascending: false })
        .limit(params?.limit ?? 50);

      if (params?.agentId) {
        request = request.eq("agent_id", params.agentId);
      }

      if (params?.operationId) {
        request = request.eq("operation_id", params.operationId);
      }

      const { data, error } = await request;

      if (error) {
        console.error("Error consultando llamadas recientes:", error);
        return { data: null, error };
      }

      const mappedData =
        data?.map((call: any) => ({
          ...call,
          client: Array.isArray(call.client)
            ? (call.client[0] ?? null)
            : (call.client ?? null),
          agent: Array.isArray(call.agent)
            ? (call.agent[0] ?? null)
            : (call.agent ?? null),
        })) || [];

      return { data: mappedData, error: null };
    } catch (error) {
      console.error("Error en getRecent:", error);
      return { data: null, error };
    }
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("calls")
      .select("*, client:clients(*)")
      .eq("id", id)
      .single();

    return { data, error };
  },
};
