// src/lib/maintenance.ts
import { supabase } from "../integrations/supabase/client";

export type MaintenanceState = {
  enabled: boolean;
  message?: string;
  updatedAt?: string;
};

function parseMaintenance(value: any): MaintenanceState {
  const enabled = Boolean(value?.enabled);
  const message = typeof value?.message === "string" ? value.message : "";
  return { enabled, message };
}

export async function fetchMaintenance(): Promise<MaintenanceState> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "maintenance")
    .maybeSingle();

  if (error) throw error;

  const parsed = parseMaintenance(data?.value);
  return { ...parsed, updatedAt: data?.updated_at ?? undefined };
}

/**
 * Suscripción Realtime (si tienes Realtime habilitado para esa tabla).
 * Si no está habilitado, no pasa nada: el polling cubrirá.
 */
export function subscribeMaintenance(onChange: (s: MaintenanceState) => void) {
  const channel = supabase
    .channel("maintenance-settings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_settings", filter: "key=eq.maintenance" },
      (payload) => {
        const row: any = payload.new;
        const parsed = parseMaintenance(row?.value);
        onChange({ ...parsed, updatedAt: row?.updated_at });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
