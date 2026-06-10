import { ArrowLeft, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import { useBranding } from "../../../shared/branding/BrandingProvider";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import { agentEyebrowClass } from "../components/agentUi";
import AgentManagementView from "../components/AgentManagementView";

export default function AgentManagementPage() {
  const { branding } = useBranding();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<UserCog className="h-5 w-5 text-brand" />}
        title="Gestion de Agentes"
        subtitle={
          <span className="hidden text-xs text-muted sm:inline">
            Usuarios, asignaciones y estado operativo
          </span>
        }
        supportingContent={
          <div className={agentEyebrowClass}>
            {branding.displayName} control plane
          </div>
        }
        actions={
          <Link to="/dashboard" className={pageHeaderActionClassName}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="brand" containerClassName="pt-6 pb-10">
          <AgentManagementView />
        </PageStage>
      </main>

      <AppFooter note="Administracion de agentes, roles y asignaciones operativas." />
    </div>
  );
}
