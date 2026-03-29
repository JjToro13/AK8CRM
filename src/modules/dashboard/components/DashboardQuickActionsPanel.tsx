import { CalendarDays, Clock, UserCog, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  canAccessAgentWorkspace,
  canAccessCampaignWorkspace,
  canUseCalendarWorkspace,
  canUseCallHistory,
  type AgentRole,
} from "../../../lib/supabase";
import { cn } from "../../../lib/utils";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";

type DashboardQuickActionsPanelProps = {
  role: AgentRole | null;
  mode?: "grid" | "rail";
};

type QuickAction = {
  key: string;
  icon: typeof Clock;
  label: string;
  note: string;
  to: string;
};

function ActionTile({
  action,
}: {
  action: QuickAction;
}) {
  const Icon = action.icon;

  return (
    <Link
      to={action.to}
      className="group rounded-[1.35rem] border border-border bg-surface px-4 py-4 shadow-[0_16px_28px_rgba(30,41,59,0.05),inset_0_1px_0_rgba(255,255,255,0.72)] transition hover:-translate-y-[2px] hover:border-brand/22 hover:bg-surface2"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand transition group-hover:bg-brand/[0.12]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{action.label}</div>
          <div className="mt-1 text-xs leading-5 text-muted">{action.note}</div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardQuickActionsPanel({
  role,
  mode = "grid",
}: DashboardQuickActionsPanelProps) {
  const showCalls = canUseCallHistory(role);
  const showCalendar = canUseCalendarWorkspace(role);
  const showAgents = canAccessAgentWorkspace(role);
  const showCampaigns = canAccessCampaignWorkspace(role);

  const actions: QuickAction[] = [
    ...(showCalls
      ? [
          {
            key: "calls",
            icon: Clock,
            label: "Historial",
            note: "Revisa actividad reciente y llamadas cerradas.",
            to: "/calls",
          },
        ]
      : []),
    {
      key: "clients",
      icon: Users,
      label: "Clientes",
      note: "Gestiona cartera, comentarios y seguimiento.",
      to: "/clients",
    },
    ...(showCalendar
      ? [
          {
            key: "calendar",
            icon: CalendarDays,
            label: "Calendario",
            note: "Agenda comercial y citas operativas.",
            to: "/calendar",
          },
        ]
      : []),
    ...(showAgents
      ? [
          {
            key: "agents",
            icon: UserCog,
            label: "Usuarios",
            note: "Roles, presencia y asignaciones del equipo.",
            to: "/agents",
          },
        ]
      : []),
    ...(showCampaigns
      ? [
          {
            key: "campaigns",
            icon: Users,
            label: "Campanas",
            note: "Controla distribucion y carga disponible.",
            to: "/campaigns",
          },
        ]
      : []),
  ];

  if (mode === "rail") {
    return (
      <section className={cn(dashboardCardClass, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              Atajos operativos
            </div>
            <p className={cn(dashboardSubTextClass, "mt-2")}>
              Acciones frecuentes en una franja ejecutiva y directa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.key}
                  to={action.to}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-surface px-4 py-2 text-sm font-semibold text-ink/82 shadow-[0_14px_28px_rgba(30,41,59,0.06)] transition hover:-translate-y-[1px] hover:border-brand/24 hover:bg-surface2"
                >
                  <Icon className="h-4 w-4 text-brand" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Modulos
          </div>
          <h2 className={cn(dashboardTitleClass, "mt-4")}>Acciones rapidas</h2>
          <p className={cn(dashboardSubTextClass, "mt-1")}>
            Atajos modulares para moverte sin depender de una sidebar tradicional.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <ActionTile key={action.key} action={action} />
        ))}
      </div>
    </section>
  );
}
