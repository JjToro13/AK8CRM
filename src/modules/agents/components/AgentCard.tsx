import { Eye, Pencil, Plus } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { Agent } from "../../../lib/supabase";
import { pageHeaderActionClassName } from "../../../shared/components/layout/PageHeader";
import {
  dashboardCardClass,
  dashboardPrimaryActionClass,
} from "../../dashboard/components/dashboardUi";
import { getAgentPresenceCopy } from "../domain/agent-presence";

type AgentCardProps = {
  agent: Agent;
  assignedCount: number;
  canAssignClients: boolean;
  canEdit: boolean;
  onAssign: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onViewDetails: (agent: Agent) => void;
  roleLabel: string;
  roleBadgeClass: (role: Agent["role"]) => string;
  totalAvailable: number;
  canReceiveAssignments: boolean;
};

const badgeBaseClass =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
const cardClass =
  "relative overflow-hidden border-white/68 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.97),rgb(var(--color-surface-elevated)/0.9))]";

export default function AgentCard({
  agent,
  assignedCount,
  canAssignClients,
  canEdit,
  onAssign,
  onEdit,
  onViewDetails,
  roleLabel,
  roleBadgeClass,
  totalAvailable,
  canReceiveAssignments,
}: AgentCardProps) {
  const presence = getAgentPresenceCopy(agent);
  const isActive = agent.is_active !== false;
  const disabledAssign =
    !isActive || !canAssignClients || !canReceiveAssignments || totalAvailable <= 0;
  const assignTitle = !isActive
    ? "El usuario esta inactivo"
    : !canAssignClients
      ? "No tienes permisos para asignar clientes"
      : !canReceiveAssignments
        ? `${roleLabel} no recibe asignaciones de clientes`
        : totalAvailable <= 0
          ? "No hay clientes disponibles para asignar"
          : "Asignar clientes";

  return (
    <div
      className={cn(
        dashboardCardClass,
        cardClass,
        "p-6 transition-all hover:-translate-y-[2px] hover:shadow-[0_28px_60px_rgba(30,41,59,0.14)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_30%)]" />

      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center">
          <span
            className={cn(
              "mr-3 h-3 w-3 flex-shrink-0 rounded-full",
              presence.dotClass,
            )}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-ink">{agent.name}</h3>
            <p className="truncate break-all text-sm text-muted">{agent.email}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 font-semibold",
                  presence.badgeClass,
                )}
              >
                {presence.badgeLabel}
              </span>
              <span className="text-muted">{presence.activityLabel}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className={cn(badgeBaseClass, roleBadgeClass(agent.role))}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit(agent)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-surface/80 text-muted shadow-[0_12px_26px_rgba(30,41,59,0.08)] transition",
              "hover:-translate-y-[1px] hover:bg-surface hover:text-ink",
            )}
            title="Editar usuario"
            aria-label="Editar usuario"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="crm-shell-soft-row relative mb-4 rounded-[1.4rem] border border-border bg-surface2 px-4 py-3">
        <div className="text-xs text-muted">
          {canReceiveAssignments ? "Clientes asignados" : "Asignacion de clientes"}
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-sm font-semibold text-ink">
            {canReceiveAssignments ? assignedCount.toLocaleString() : "No aplica"}
          </div>
          <div className="text-xs text-muted">
            {canReceiveAssignments
              ? assignedCount > 0
                ? "Con carga"
                : "Sin carga"
              : "Rol administrativo"}
          </div>
        </div>
      </div>

      <div className="relative flex gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(agent)}
          className={cn(pageHeaderActionClassName, "flex-1 justify-center")}
        >
          <Eye className="h-4 w-4" />
          Ver detalles
        </button>

        <button
          type="button"
          onClick={() => onAssign(agent)}
          className={cn(dashboardPrimaryActionClass, "flex-1 justify-center")}
          disabled={disabledAssign}
          title={assignTitle}
        >
          <Plus className="h-4 w-4" />
          {!isActive
            ? "Inactivo"
            : !canAssignClients
              ? "Sin permiso"
              : canReceiveAssignments
                ? "Asignar"
                : "No aplica"}
        </button>
      </div>
    </div>
  );
}
