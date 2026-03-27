import { ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import CampaignManagementView from "../components/CampaignManagementView";

export default function CampaignManagementPage() {
  const { activeOperationId, canSeeAllOperations, operationId, operationReady } =
    useAuth();

  const selectedOperationId = canSeeAllOperations
    ? activeOperationId
    : operationId;

  const scopeLabel = canSeeAllOperations
    ? !operationReady
      ? "Esperando operacion activa"
      : selectedOperationId
        ? "Filtrando por operacion activa"
        : "Sin operacion activa seleccionada"
    : "Mostrando tu operacion asignada";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<Users className="h-5 w-5 text-brand" />}
        title="Gestion de Campañas"
        subtitle={
          <span className="text-xs text-muted hidden sm:inline">
            Importacion, exportacion y control de bloqueo
          </span>
        }
        actions={
          <Link to="/dashboard" className={pageHeaderActionClassName}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
        meta={<div className="text-xs text-muted">{scopeLabel}</div>}
      />

      <main className="flex-1 w-full">
        <PageStage tone="brand">
          <CampaignManagementView selectedOperationId={selectedOperationId} />
        </PageStage>
      </main>

      <AppFooter note="Control de campañas, importacion de bases y reportes por prefijo." />
    </div>
  );
}
