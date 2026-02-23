// submitAdminReport.ts - Función para enviar un reporte de admin a la base de datos. Recibe un payload con título, detalles y opcionalmente la página relacionada. También captura información adicional como la URL actual, user agent y zona horaria. El reporte se asocia al usuario autenticado si hay uno.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportPayload = {
  id: string;
  createdAt: string;
  title: string;
  details: string;
  page?: string;
};

export async function submitAdminReport(
  supabase: SupabaseClient,
  payload: ReportPayload
) {
  console.log("[report] submit payload:", payload);

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.error("[report] getUser error:", userErr);
  }

  const url = window.location.href;
  const userAgent = navigator.userAgent;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { error } = await supabase.from("admin_reports").insert({
  title: payload.title,
  details: payload.details,
  page: payload.page ?? null,
  url,
  user_agent: userAgent,
  tz,
  auth_user_id: user?.id ?? null,
});

if (error) throw error;
console.log("[report] insert OK (no returning)");


}
