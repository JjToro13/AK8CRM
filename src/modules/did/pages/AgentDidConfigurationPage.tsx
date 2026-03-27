import { ArrowLeft, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import DidConfigurationView from "../components/DidConfigurationView";

export default function AgentDidConfigurationPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<Settings className="h-5 w-5 text-brand" />}
        title="Configuracion de Did-glo-bal"
        subtitle={
          <span className="text-xs text-muted hidden sm:inline">
            Extensiones por agente y webhook operativo
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
          <DidConfigurationView />
        </PageStage>
      </main>

      <AppFooter note="Configuracion de extensiones, pruebas y webhook de la centralita." />
    </div>
  );
}
