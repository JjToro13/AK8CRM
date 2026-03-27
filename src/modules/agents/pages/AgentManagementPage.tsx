import { ArrowLeft, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import AgentManagementView from "../components/AgentManagementView";

export default function AgentManagementPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<UserCog className="h-5 w-5 text-brand" />}
        title="Gestion de Agentes"
        subtitle={
          <span className="text-xs text-muted hidden sm:inline">
            Usuarios, asignaciones y estado operativo
          </span>
        }
        actions={
          <Link to="/dashboard" className={pageHeaderActionClassName}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="brand">
          <AgentManagementView />
        </PageStage>
      </main>

      <AppFooter note="Administracion de agentes, roles y asignaciones operativas." />
    </div>
  );
}
