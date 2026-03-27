import { createClient } from "@supabase/supabase-js";
import { appEnv } from "../../config/env";

export type SupabaseBrowserConfig = {
  url: string;
  anonKey: string;
};

export function createSupabaseBrowserClient(config: SupabaseBrowserConfig) {
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = createSupabaseBrowserClient({
  url: appEnv.supabase.url,
  anonKey: appEnv.supabase.anonKey,
});
