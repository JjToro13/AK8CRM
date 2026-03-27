import type { Agent } from "../../../lib/supabase";

export interface AgentManagementProps {
  compact?: boolean;
}

export type AgentCountRow = {
  agent_id: string;
  assigned_count: number;
};

export type AvailableCampaignRow = {
  id: string;
  prefix: string;
  display_name: string | null;
  available: number;
};

export type AgentCountsMap = Record<string, number>;

export type CampaignNamesMap = Record<string, string>;

export type AgentManagementModalState = {
  selectedAgent: Agent | null;
  showAgentDetails: boolean;
  showAssignmentModal: boolean;
  showUpsertModal: boolean;
  upsertMode: "create" | "edit";
};
