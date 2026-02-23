/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_CREATION_PASSWORD: string
  readonly VITE_COMPANY_EMAIL: string
  readonly VITE_SMTP_HOST: string
  readonly VITE_SMTP_PORT: string
  readonly VITE_SMTP_USER: string
  readonly VITE_SMTP_PASS: string
  readonly VITE_ENCRYPTION_KEY: string
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
