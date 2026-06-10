/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_TIMEOUT_MS?: string
  readonly VITE_ENABLE_CALLS?: string
  readonly VITE_MAINT_BYPASS?: string
  readonly VITE_ENABLE_RESILIENCE_DEBUGGER?: string
  readonly VITE_ENCRYPTION_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
