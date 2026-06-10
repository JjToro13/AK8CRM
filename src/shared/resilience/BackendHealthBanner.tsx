import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useBackendHealth } from "./BackendHealthProvider";

export default function BackendHealthBanner() {
  const { isDegraded, isManualDegraded, lastIssueMessage } = useBackendHealth();

  if (!isDegraded) {
    return null;
  }

  const Icon = isManualDegraded ? ShieldAlert : AlertTriangle;

  return (
    <div className="fixed bottom-4 left-4 z-[75] max-w-xl rounded-[1.35rem] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.92))] px-4 py-3 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2">
          <Icon className="h-5 w-5 text-amber-700" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-amber-900">
            {isManualDegraded
              ? "Modo degradado activado para pruebas"
              : "Modo de contingencia activo"}
          </div>
          <div className="mt-1 text-sm leading-relaxed text-amber-800">
            {isManualDegraded
              ? "Las vistas mas pesadas reducen lecturas para validar el comportamiento de contingencia."
              : "La app detecto lentitud o errores temporales en la base. Se reducen consultas pesadas para mantener el CRM accesible."}
          </div>
          {lastIssueMessage ? (
            <div className="mt-2 text-xs text-amber-700">
              Ultimo evento: {lastIssueMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
