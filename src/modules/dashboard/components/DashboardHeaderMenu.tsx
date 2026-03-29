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
    <details className="group relative isolate">
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

      <div className="absolute right-0 top-full z-[120] mt-3 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-white/88 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.95))] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.22),0_6px_18px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-200)/0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.56),rgba(255,255,255,0.12)_28%,transparent_100%)] supports-[backdrop-filter]:bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.94),rgb(var(--color-surface-elevated)/0.9))]">
        <div className="relative z-10 mb-4">
          <SecurityInfo
            isAdmin={role === "dev" || role === "owner" || role === "manager"}
            menuStats={{ today, inProgress, recent: recentCount }}
            mode="menu"
          />
        </div>

        <div className="relative z-10 space-y-3">
          <BrandPresetSelector enabled={role === "dev"} />

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
