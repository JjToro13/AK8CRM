import { CalendarDays, Clock, Settings, UserCog, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { pageHeaderActionClassName } from "../../../shared/components/layout/PageHeader";
import {
  dashboardCardClass,
  dashboardPrimaryActionClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";

type DashboardQuickActionsPanelProps = {
  isAdmin: boolean;
};

export default function DashboardQuickActionsPanel({
  isAdmin,
}: DashboardQuickActionsPanelProps) {
  return (
    <section className={dashboardCardClass}>
      <h2 className={dashboardTitleClass}>Acciones Rapidas</h2>
      <p className={cn(dashboardSubTextClass, "mt-1")}>
        Accede a lo mas usado con un click.
      </p>

      <div className="mt-5 space-y-3">
        <Link
          to="/calls"
          className={cn(pageHeaderActionClassName, "w-full justify-center")}
        >
          <Clock className="w-4 h-4" />
          Ver Historial
        </Link>

        <Link
          to="/clients"
          className={cn(pageHeaderActionClassName, "w-full justify-center")}
        >
          <Users className="w-4 h-4" />
          Gestionar Clientes
        </Link>

        <Link
          to="/calendar"
          className={cn(pageHeaderActionClassName, "w-full justify-center")}
        >
          <CalendarDays className="w-4 h-4" />
          Calendario Comercial
        </Link>

        {isAdmin ? (
          <>
            <Link
              to="/agents"
              className={cn(pageHeaderActionClassName, "w-full justify-center")}
            >
              <UserCog className="w-4 h-4" />
              Gestionar Agentes
            </Link>

            <Link
              to="/did"
              className={cn(
                dashboardPrimaryActionClass,
                "w-full justify-center",
              )}
            >
              <Settings className="w-4 h-4" />
              Configurar Did-glo-bal
            </Link>

            <Link
              to="/campaigns"
              className={cn(pageHeaderActionClassName, "w-full justify-center")}
            >
              <Users className="w-4 h-4" />
              Gestionar Campañas
            </Link>
          </>
        ) : null}
      </div>
    </section>
  );
}
