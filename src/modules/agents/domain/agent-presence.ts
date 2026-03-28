import type { Agent } from "../../../shared/types/crm";

export type AgentPresenceState = "online" | "away" | "offline" | "inactive";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const AWAY_WINDOW_MS = 10 * 60 * 1000;

function parseLastSeen(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return null;

  const parsed = new Date(lastSeenAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatElapsed(lastSeenAt: string | null | undefined) {
  const parsed = parseLastSeen(lastSeenAt);

  if (!parsed) {
    return "Sin actividad reciente";
  }

  const elapsedMs = Math.max(0, Date.now() - parsed.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) {
    return "hace menos de 1 min";
  }

  if (elapsedMinutes < 60) {
    return `hace ${elapsedMinutes} min`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `hace ${elapsedHours} h`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `hace ${elapsedDays} d`;
}

export function getAgentPresenceState(
  agent: Pick<Agent, "is_active" | "last_seen_at" | "presence_status">,
): AgentPresenceState {
  if (agent.is_active === false) {
    return "inactive";
  }

  if (agent.presence_status === "offline") {
    return "offline";
  }

  const parsed = parseLastSeen(agent.last_seen_at);
  if (!parsed) {
    return "offline";
  }

  const elapsedMs = Math.max(0, Date.now() - parsed.getTime());

  if (elapsedMs <= ONLINE_WINDOW_MS) {
    return "online";
  }

  if (elapsedMs <= AWAY_WINDOW_MS) {
    return "away";
  }

  return "offline";
}

export function getAgentPresenceCopy(
  agent: Pick<Agent, "is_active" | "last_seen_at" | "presence_status">,
) {
  const state = getAgentPresenceState(agent);

  switch (state) {
    case "online":
      return {
        state,
        badgeLabel: "En linea",
        badgeClass:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        dotClass: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]",
        activityLabel: "Activo ahora",
      };
    case "away":
      return {
        state,
        badgeLabel: "Ausente",
        badgeClass: "border border-amber-200 bg-amber-50 text-amber-700",
        dotClass: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]",
        activityLabel: `Activo ${formatElapsed(agent.last_seen_at)}`,
      };
    case "inactive":
      return {
        state,
        badgeLabel: "Inactivo",
        badgeClass: "border border-rose-200 bg-rose-50 text-rose-700",
        dotClass: "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.35)]",
        activityLabel: "Usuario deshabilitado",
      };
    case "offline":
    default:
      return {
        state: "offline" as const,
        badgeLabel: "Offline",
        badgeClass: "border border-slate-200 bg-slate-100 text-slate-700",
        dotClass: "bg-slate-300",
        activityLabel: `Ultima actividad ${formatElapsed(agent.last_seen_at)}`,
      };
  }
}
