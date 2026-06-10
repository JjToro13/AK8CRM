import { Layers3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import { pageHeaderActionClassName } from "../../../shared/components/layout/PageHeader";
import type { VisibleTenant } from "../types/dashboard.types";

type DashboardTenantSelectProps = {
  enabled: boolean;
  loading: boolean;
  tenants: VisibleTenant[];
  selectedTenantId: string | null;
  onSelect: (tenantId: string) => void;
};

const TENANT_PLACEHOLDER_VALUE = "__tenant_placeholder__";

export default function DashboardTenantSelect({
  enabled,
  loading,
  tenants,
  selectedTenantId,
  onSelect,
}: DashboardTenantSelectProps) {
  if (!enabled) return null;

  const safeValue =
    selectedTenantId && tenants.some((tenant) => tenant.id === selectedTenantId)
      ? selectedTenantId
      : TENANT_PLACEHOLDER_VALUE;

  const handleValueChange = (value: string) => {
    if (value === TENANT_PLACEHOLDER_VALUE) return;
    onSelect(value);
  };

  return (
    <Select
      value={safeValue}
      onValueChange={handleValueChange}
      disabled={loading || tenants.length === 0}
    >
      <SelectTrigger
        leftIcon={<Layers3 className="h-4 w-4" />}
        className={`${pageHeaderActionClassName} min-w-[188px] border-white/85 bg-white/74 py-2 shadow-[0_18px_38px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.88)] hover:bg-white/86`}
      >
        <div className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Tenant
          </span>
          <SelectValue placeholder={loading ? "Cargando..." : "Seleccionar"} />
        </div>
      </SelectTrigger>

      <SelectContent className="border-white/88 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.95))] shadow-[0_28px_72px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)]">
        <SelectItem value={TENANT_PLACEHOLDER_VALUE} disabled>
          {loading ? "Cargando..." : "Seleccionar"}
        </SelectItem>
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.product_name?.trim() || tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
