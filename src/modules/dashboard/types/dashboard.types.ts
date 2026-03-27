import type { Call, Client } from "../../../shared/types/crm";

export type DashboardRole = "dev" | "super_admin" | "admin" | "agent" | null;

export type Operation = {
  id: string;
  slug: string;
  name: string;
  tenant_id?: string | null;
};

export type VisibleTenant = {
  id: string;
  slug: string;
  name: string;
  product_name?: string | null;
  brand_preset_id?: string | null;
};

export interface DashboardProps {
  isAdmin: boolean;
  canSeeAllOperations?: boolean;
  operationReady?: boolean;
  role?: DashboardRole;
}

export interface DashboardSearchPanelProps {
  loading: boolean;
  onCallStarted: () => void;
  onEditClient: (client: Client) => void;
  onSearchChange: (value: string) => void;
  opLocked: boolean;
  searchQuery: string;
  searchResults: Client[];
}

export interface DashboardRecentCallsPanelProps {
  callsLoading: boolean;
  recentCalls: Call[];
}
