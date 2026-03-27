import { supabase } from "../../../integrations/supabase/client";
import { agentNameMap } from "../../../shared/services/agent-name-map";

export const clientComments = {
  getByClient: async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("client_comments")
        .select("id, comment, created_at, agent_id, agent:agents(name)")
        .eq("client_id", clientId)
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
        agent: {
          id: row.agent_id,
          name: map.get(row.agent_id) ?? row.agent_id,
        },
      }));

      return { data: enriched, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  add: async (clientId: string, agentId: string, comment: string) => {
    try {
      const { data, error } = await supabase
        .from("client_comments")
        .insert({
          client_id: clientId,
          agent_id: agentId,
          comment: comment.trim(),
        })
        .select()
        .maybeSingle();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  update: async (commentId: string, newComment: string) => {
    try {
      const { data, error } = await supabase
        .from("client_comments")
        .update({
          comment: newComment.trim(),
        })
        .eq("id", commentId)
        .select();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },
};
