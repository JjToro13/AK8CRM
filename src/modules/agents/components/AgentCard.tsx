import { Eye, Pencil, Plus } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { Agent } from "../../../lib/supabase";
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
const pillButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
  "shadow-[0_8px_20px_rgba(17,24,39,0.06)] hover:shadow-[0_12px_26px_rgba(17,24,39,0.09)] " +
  "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";
const pillPrimaryClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft " +
  "bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 " +
  "transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

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
        "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6",
        "hover:shadow-soft2 transition-shadow",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center min-w-0 flex-1">
          <span
            className={cn(
              "w-3 h-3 rounded-full mr-3 flex-shrink-0",
              presence.dotClass,
            )}
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink truncate">{agent.name}</h3>
            <p className="text-sm text-muted truncate break-all">{agent.email}</p>
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
              "h-10 w-10 rounded-2xl border border-border bg-surface hover:bg-surface2 transition",
              "flex items-center justify-center text-muted hover:text-ink",
            )}
            title="Editar usuario"
            aria-label="Editar usuario"
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-surface2 px-4 py-3 mb-4">
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(agent)}
          className={cn(pillButtonClass, "flex-1 justify-center")}
        >
          <Eye className="h-4 w-4" />
          Ver detalles
        </button>

        <button
          type="button"
          onClick={() => onAssign(agent)}
          className={cn(pillPrimaryClass, "flex-1 justify-center")}
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
