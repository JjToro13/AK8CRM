import { LogOut, PanelTopOpen, ChevronDown } from "lucide-react";
import BrandPresetSelector from "../../../shared/components/layout/BrandPresetSelector";
import { pageHeaderActionClassName } from "../../../shared/components/layout/PageHeader";
import type { Operation, VisibleTenant } from "../types/dashboard.types";
import DashboardOperationSelect from "./DashboardOperationSelect";
import DashboardTenantSelect from "./DashboardTenantSelect";
import SecurityInfo from "./SecurityInfo";

type DashboardHeaderMenuProps = {
  canSeeAllOperations: boolean;
  inProgress: number;
  loading: boolean;
  operations: Operation[];
  recentCount: number;
  role: string | null | undefined;
  selectedOperationId: string | null;
  selectedTenantId: string | null;
  tenants: VisibleTenant[];
  today: number;
  onSelectOperation: (operationId: string) => void;
  onSelectTenant: (tenantId: string) => void;
  onSignOut: () => void;
};

export default function DashboardHeaderMenu({
  canSeeAllOperations,
  inProgress,
  loading,
  operations,
  recentCount,
  role,
  selectedOperationId,
  selectedTenantId,
  tenants,
  today,
  onSelectOperation,
  onSelectTenant,
  onSignOut,
}: DashboardHeaderMenuProps) {
  const selectedTenant =
    tenants.find((tenant) => tenant.id === selectedTenantId)?.product_name?.trim() ||
    tenants.find((tenant) => tenant.id === selectedTenantId)?.name ||
    "Workspace";

  return (
    <details className="group relative">
      <summary
        className={`${pageHeaderActionClassName} min-w-[12.5rem] list-none cursor-pointer py-2 [&::-webkit-details-marker]:hidden`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand">
            <PanelTopOpen className="h-4 w-4" />
          </span>

          <div className="min-w-0 text-left leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Workspace
            </div>
            <div className="truncate text-sm font-semibold text-ink/88">
              {selectedTenant}
            </div>
          </div>

          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="crm-dashboard-menu absolute right-0 top-full z-[120] mt-3 w-[min(25rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/72 bg-surface/96 p-4 shadow-[0_26px_70px_rgba(30,41,59,0.18),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl">
        <div className="mb-4">
          <SecurityInfo
            isAdmin={role === "dev" || role === "owner" || role === "manager"}
            menuStats={{ today, inProgress, recent: recentCount }}
            mode="menu"
          />
        </div>

        <div className="space-y-3">
          <BrandPresetSelector enabled />

          <DashboardTenantSelect
            enabled={canSeeAllOperations}
            loading={loading}
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            onSelect={onSelectTenant}
          />

          <DashboardOperationSelect
            enabled={canSeeAllOperations}
            loading={loading}
            operations={operations}
            selectedOperationId={selectedOperationId}
            onSelect={onSelectOperation}
          />

          <button
            onClick={onSignOut}
            className={`${pageHeaderActionClassName} w-full justify-center`}
            type="button"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </div>
    </details>
  );
}
