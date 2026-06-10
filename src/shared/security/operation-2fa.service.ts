import { supabase } from "../../integrations/supabase/client";

export type Operation2faStatus = {
  operation_id: string;
  required: boolean;
  verified: boolean;
  verified_until: string | null;
};

export const operation2fa = {
  getStatus: async (operationId: string) => {
    const { data, error } = await supabase.rpc("get_operation_2fa_status", {
      p_operation_id: operationId,
    });

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: (row ?? null) as Operation2faStatus | null,
      error,
    };
  },

  verify: async (operationId: string, code: string) => {
    const { data, error } = await supabase.functions.invoke("operation-2fa", {
      body: {
        action: "verify",
        operation_id: operationId,
        code,
      },
    });

    return {
      data: (data?.data ?? null) as
        | {
            required: boolean;
            verified: boolean;
            expires_at?: string | null;
          }
        | null,
      error,
    };
  },
};
