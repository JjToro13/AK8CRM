import { Plus, RefreshCw, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useBranding } from "../../../shared/branding/BrandingProvider";
import {
  agentCardClass,
  agentEyebrowClass,
  agentGhostButtonClass,
  agentPrimaryButtonClass,
  agentSubTextClass,
  agentTitleClass,
} from "./agentUi";

type AgentManagementHeaderProps = {
  canCreateAgent: boolean;
  onCreateAgent: () => void;
  onRefresh: () => void;
};

const cardClass =
  "relative overflow-hidden border-brand/15 bg-[linear-gradient(135deg,rgb(var(--color-brand-100)/0.24),rgb(var(--color-surface)/0.96)_38%,rgb(var(--color-shell-accent)/0.18)_100%)] py-5 sm:py-6";

export default function AgentManagementHeader({
  canCreateAgent,
  onCreateAgent,
  onRefresh,
}: AgentManagementHeaderProps) {
  const { branding } = useBranding();

  return (
    <div className={cn(agentCardClass, cardClass)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_32%)]" />
      <div className="pointer-events-none absolute right-[-1rem] top-[-2rem] h-36 w-36 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-2rem] right-[-1rem] h-28 w-56 rotate-[7deg] rounded-[50%] border-[14px] border-brand/18 bg-surface/80 opacity-75" />
      <div className="pointer-events-none absolute bottom-[-1rem] right-10 h-20 w-44 rotate-[7deg] rounded-[50%] border-[12px] border-brand/12 bg-surface/65 opacity-85" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="flex max-w-2xl items-start gap-4">
          <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-white/70 bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Users className="h-5 w-5 text-brand" />
          </div>

          <div className="min-w-0">
            <div className={agentEyebrowClass}>
              Centro operativo
            </div>
            <h2 className={cn(agentTitleClass, "mt-4 text-xl sm:text-2xl")}>
              Gestion de usuarios operativos
            </h2>
            <p className={cn(agentSubTextClass, "mt-2 max-w-2xl")}>
              Mismo sistema visual del producto, con presencia, carga operativa y
              asignaciones usando el branding activo de {branding.productName}.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              {["Presencia", "Asignacion", branding.displayName].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/76 bg-white/72 px-3 py-1.5 text-ink/78 shadow-[0_12px_24px_rgba(30,41,59,0.06)]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            onClick={onRefresh}
            className={agentGhostButtonClass}
            title="Recargar agentes"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>

          {canCreateAgent ? (
            <button
              type="button"
              onClick={onCreateAgent}
              className={agentPrimaryButtonClass}
              title="Crear un nuevo usuario"
            >
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
