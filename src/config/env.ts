const FALLBACK_ENCRYPTION_KEY =
  "default-encryption-key-change-in-production";

function readEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function requireEnv(name: keyof ImportMetaEnv) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Falta ${name} en tu .env`);
  }

  return value;
}

export const appEnv = {
  supabase: {
    url: requireEnv("VITE_SUPABASE_URL"),
    anonKey: requireEnv("VITE_SUPABASE_ANON_KEY"),
  },
  features: {
    enableCalls: readEnv("VITE_ENABLE_CALLS") === "true",
    maintenanceBypass:
      import.meta.env.DEV && readEnv("VITE_MAINT_BYPASS") === "true",
  },
  security: {
    encryptionKey:
      readEnv("VITE_ENCRYPTION_KEY") || FALLBACK_ENCRYPTION_KEY,
  },
} as const;

export function buildSupabaseFunctionUrl(functionName: string) {
  const normalized = functionName.replace(/^\/+/, "");
  return `${appEnv.supabase.url}/functions/v1/${normalized}`;
}
