import { supabase } from "../../../integrations/supabase/client";

export const clientComments = {
  getByClient: async (
    clientId: string,
    params?: {
      page?: number;
      pageSize?: number;
      includeCount?: boolean;
      orderDirection?: "asc" | "desc";
    },
  ) => {
    try {
      const page = Math.max(1, params?.page ?? 1);
      const pageSize = Math.max(1, params?.pageSize ?? 10);
      const includeCount = params?.includeCount ?? false;
      const orderDirection = params?.orderDirection ?? "desc";
      const from = (page - 1) * pageSize;
      const to = from + pageSize;

      const { data, error, count } = await supabase
        .from("client_comments")
        .select(
          "id, client_id, comment, created_at, agent_id, agent_name_snapshot, agent:agents(name)",
          includeCount ? { count: "exact" } : undefined,
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: orderDirection === "asc" })
        .range(from, to);

      if (error) {
        return { data: null, error, count: 0, hasMore: false };
      }

      const rows = (data ?? []) as any[];
      const limitedRows = rows.slice(0, pageSize);

      const enriched = limitedRows.map((row) => ({
        ...row,
        agent: {
          id: row.agent_id,
          name:
            row.agent_name_snapshot ||
            (Array.isArray(row.agent)
              ? row.agent[0]?.name
              : row.agent?.name) ||
            row.agent_id,
        },
      }));

      return {
        data: enriched,
        error: null,
        count: includeCount ? (count ?? limitedRows.length) : null,
        hasMore: rows.length > pageSize,
      };
    } catch (error) {
      return { data: null, error, count: null, hasMore: false };
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
