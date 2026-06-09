import type { ClientStatusCode } from "../../lib/utils";

export interface Client {
  id: string;
  tenant_id?: string | null;
  operation_id?: string | null;
  campaign_id?: string | null;
  campaign?: {
    id?: string;
    prefix?: string | null;
    display_name?: string | null;
  } | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  assigned_by?: string | null;
  quarantined_until?: string | null;
  quarantine_reason?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  country?: string;
  source?: string;
  funnel?: string;
  deposit_amount?: number;
  net_deposit?: number;
  user_balance?: number;
  last_comment?: string | null;
  last_comment_at?: string | null;
  last_comment_agent?: string | null;
  comment_count?: number | null;
  agent?: {
    name?: string;
  } | null;
  assigned_agent?: {
    name?: string;
  } | null;
  name?: string;
  serial: string;
  trading_company?: string;
  investment_date?: string;
  status_color: "gray" | "red" | "yellow" | "green" | "blue";
  status_code?: ClientStatusCode | null;
  attempts: number;
  created_at: string;
  updated_at?: string;
}

export interface ClientComment {
  id: string;
  client_id: string;
  agent_id: string;
  comment: string;
  created_at: string;
  agent_name_snapshot?: string | null;
  agent?: {
    id: string;
    name: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: "dev" | "owner" | "manager" | "loader" | "agent";
  is_active?: boolean;
  operation_id?: string | null;
  active_operation_id?: string | null;
  created_at: string;
  updated_at?: string;
  presence_status?: "online" | "offline" | null;
  last_seen_at?: string | null;
}

export type AgentRole = Agent["role"];

export function getAgentManagementVisibleRoles(
  viewerRole: AgentRole | null | undefined,
): AgentRole[] {
  switch (viewerRole) {
    case "dev":
      return ["owner", "manager", "loader", "agent"];
    case "owner":
      return ["owner", "manager", "loader", "agent"];
    case "manager":
      return ["loader", "agent"];
    default:
      return [];
  }
}

export function getAgentRoleLabel(role: AgentRole | null | undefined) {
  switch (role) {
    case "dev":
      return "Developer";
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "loader":
      return "Loader";
    case "agent":
      return "Agente";
    default:
      return "Usuario";
  }
}

export function canCreateManagedUsers(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner";
}

export function canAccessAgentWorkspace(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner" || role === "manager";
}

export function canEditManagedUsers(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner";
}

export function canAssignOperationalClients(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner" || role === "manager";
}

export function canAccessCampaignWorkspace(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner";
}

export function canAccessAdminPanel(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner";
}

export function canUseClientActions(
  role: AgentRole | null | undefined,
): boolean {
  return role === "dev" || role === "owner" || role === "manager" || role === "agent";
}

export function canUseCalendarWorkspace(
  role: AgentRole | null | undefined,
): boolean {
  return canUseClientActions(role);
}

export function canUseCallHistory(
  role: AgentRole | null | undefined,
): boolean {
  return canUseClientActions(role);
}

export function isOperationalAgentRole(
  role: AgentRole | null | undefined,
): boolean {
  return role === "agent";
}

export interface Call {
  id: string;
  client_id: string;
  agent_id: string;
  start_time: string;
  end_time?: string;
  status: "in_progress" | "completed" | "failed" | "no_answer";
  duration?: number;
  created_at: string;
  client?: Client;
  agent?: { id: string; name: string };
}

export interface AgentAssignment {
  id: string;
  agent_id: string;
  client_serial_start: string;
  client_serial_end: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  agent?: { id: string; name: string };
  assigned_by_agent?: { id: string; name: string };
}

export interface AgentDidCredentials {
  id: string;
  agent_id: string;
  extension_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  agent?: { id: string; name: string; email?: string; role?: string };
}
