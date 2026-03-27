import { supabase } from "../../integrations/supabase/client";

export async function agentNameMap(agentIds: string[]) {
  const ids = Array.from(new Set((agentIds ?? []).filter(Boolean)));
  const map = new Map<string, string>();

  if (ids.length === 0) {
    return map;
  }

  const { data, error } = await supabase.rpc("agent_name_map", {
    p_agent_ids: ids,
  });

  if (error) {
    console.warn("[agent_name_map] failed:", error.message);
    return map;
  }

  (Array.isArray(data) ? data : []).forEach((row: any) => {
    const id = String(row.id ?? "");
    const label = String(row.label ?? "").trim();

    if (id && label) {
      map.set(id, label);
    }
  });

  return map;
}
