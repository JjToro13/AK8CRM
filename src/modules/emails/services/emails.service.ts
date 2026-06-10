import { supabase } from "../../../integrations/supabase/client";

export const emails = {
  send: async (
    clientId: string,
    subject: string,
    message: string,
    agentId?: string,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { client_id: clientId, subject, message, agent_id: agentId },
      });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  sendWithAccount: async (
    clientId: string,
    subject: string,
    message: string,
    agentId?: string,
    emailAccountId?: number,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          client_id: clientId,
          subject,
          message,
          agent_id: agentId,
          email_account_id: emailAccountId,
        },
      });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  getHistory: async (clientId?: string) => {
    try {
      let query = supabase
        .from("email_logs")
        .select("*, client:clients(name, serial)")
        .order("sent_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
