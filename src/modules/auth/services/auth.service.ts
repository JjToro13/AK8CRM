import { supabase } from "../../../integrations/supabase/client";

export const auth = {
  getCurrentUser: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return { error };
  },

  isAdmin: async () => {
    try {
      const { data, error } = await supabase.rpc("my_agent");

      if (error) {
        throw error;
      }

      const agent = Array.isArray(data) ? data[0] : data;
      const role = agent?.role as string | undefined;

      return role === "admin" || role === "dev" || role === "super_admin";
    } catch (error) {
      console.error("Error verificando admin:", error);
      return false;
    }
  },
};
