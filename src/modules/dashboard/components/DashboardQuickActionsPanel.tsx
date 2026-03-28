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
import { pageHeaderActionClassName } from "../../../shared/components/layout/PageHeader";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";

type DashboardQuickActionsPanelProps = {
  role: AgentRole | null;
};

export default function DashboardQuickActionsPanel({
  role,
}: DashboardQuickActionsPanelProps) {
  const showCalls = canUseCallHistory(role);
  const showCalendar = canUseCalendarWorkspace(role);
  const showAgents = canAccessAgentWorkspace(role);
  const showCampaigns = canAccessCampaignWorkspace(role);

  return (
    <section className={dashboardCardClass}>
      <h2 className={dashboardTitleClass}>Acciones Rapidas</h2>
      <p className={cn(dashboardSubTextClass, "mt-1")}>
        Accede a lo mas usado segun tu alcance actual.
      </p>

      <div className="mt-5 space-y-3">
        {showCalls ? (
          <Link
            to="/calls"
            className={cn(pageHeaderActionClassName, "w-full justify-center")}
          >
            <Clock className="h-4 w-4" />
            Ver Historial
          </Link>
        ) : null}

        <Link
          to="/clients"
          className={cn(pageHeaderActionClassName, "w-full justify-center")}
        >
          <Users className="h-4 w-4" />
          Gestionar Clientes
        </Link>

        {showCalendar ? (
          <Link
            to="/calendar"
            className={cn(pageHeaderActionClassName, "w-full justify-center")}
          >
            <CalendarDays className="h-4 w-4" />
            Calendario Comercial
          </Link>
        ) : null}

        {showAgents ? (
          <Link
            to="/agents"
            className={cn(pageHeaderActionClassName, "w-full justify-center")}
          >
            <UserCog className="h-4 w-4" />
            Gestionar Usuarios
          </Link>
        ) : null}

        {showCampaigns ? (
          <Link
            to="/campaigns"
            className={cn(pageHeaderActionClassName, "w-full justify-center")}
          >
            <Users className="h-4 w-4" />
            Gestionar Campanas
          </Link>
        ) : null}
      </div>
    </section>
  );
}
