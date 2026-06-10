import { Check, Link as LinkIcon, Save, Settings, X } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import Field from "../../../shared/components/ui/Field";
import Input from "../../../shared/components/ui/Input";
import { cn } from "../../../lib/utils";
import type { Agent, AgentDidCredentials } from "../../../shared/types/crm";
import type { DidTestResult } from "../types/agent-did.types";
import {
  didCardClass,
  didPillButtonClass,
  didPillPrimaryClass,
  didTitleClass,
} from "./didUi";

type DidConfigurationPanelProps = {
  extensionNumber: string;
  hasSelectedCreds: boolean;
  onExtensionChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  selectedAgent: Agent | null;
  selectedCreds: AgentDidCredentials | null;
  testResult: DidTestResult | null;
  testing: boolean;
  webhookUrl: string;
};

function DidResultCard({ result }: { result: DidTestResult }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        result.success
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50",
      )}
    >
      <div
        className={cn(
          "text-sm font-semibold",
          result.success ? "text-emerald-900" : "text-red-800",
        )}
      >
        {result.success ? "Listo" : "Atencion"}
      </div>
      <div
        className={cn(
          "text-sm mt-1",
          result.success ? "text-emerald-900/80" : "text-red-800/90",
        )}
      >
        {result.message}
      </div>
    </div>
  );
}

export default function DidConfigurationPanel({
  extensionNumber,
  hasSelectedCreds,
  onExtensionChange,
  onSave,
  onTest,
  saving,
  selectedAgent,
  selectedCreds,
  testResult,
  testing,
  webhookUrl,
}: DidConfigurationPanelProps) {
  if (!selectedAgent) {
    return (
      <section className={didCardClass}>
        <div className="min-h-[320px] flex flex-col items-center justify-center text-center p-8">
          <div className="h-14 w-14 rounded-2xl bg-surface2 border border-border flex items-center justify-center">
            <Settings className="h-7 w-7 text-muted" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-ink">
            Selecciona un agente
          </h3>
          <p className="mt-2 text-sm text-muted max-w-md">
            Haz clic en un agente de la lista para configurar su extension de
            Did-glo-bal.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={didCardClass}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={didTitleClass}>Configurar: {selectedAgent.name}</h3>
            <div className="text-xs text-muted mt-1">{selectedAgent.email}</div>
          </div>

          {hasSelectedCreds ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
              <Check className="w-4 h-4" />
              Configurado
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
              <X className="w-4 h-4 text-red-500" />
              Pendiente
            </div>
          )}
        </div>

        <Field
          label="Numero de extension"
          required
          hint="Extension del agente en Did-glo-bal (recomendado: 101-110)."
        >
          <Input
            type="text"
            value={extensionNumber}
            onChange={(event) => onExtensionChange(event.target.value)}
            placeholder="Ej: 101, 102, 103..."
            disabled={saving}
          />
        </Field>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onTest}
            disabled={testing || saving || !extensionNumber}
            className={didPillButtonClass}
            type="button"
          >
            {testing ? (
              <LoadingSpinner size="sm" text="Probando..." fullScreen={false} />
            ) : (
              <>
                <Check className="h-4 w-4" />
                Probar
              </>
            )}
          </button>

          <button
            onClick={onSave}
            disabled={saving || testing || !extensionNumber}
            className={didPillPrimaryClass}
            type="button"
          >
            {saving ? (
              <LoadingSpinner size="sm" text="Guardando..." fullScreen={false} />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar
              </>
            )}
          </button>
        </div>

        {testResult ? <DidResultCard result={testResult} /> : null}

        <div className="rounded-[1.5rem] border border-brand/20 bg-brand/5 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center mt-0.5">
              <LinkIcon className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink/90">
                Configuracion del Webhook en Did-glo-bal
              </div>
              <p className="text-sm text-ink/70 mt-1">
                En el panel de Did-glo-bal, configura esta URL de webhook:
              </p>

              <code className="mt-3 block rounded-2xl border border-border bg-surface px-4 py-3 text-xs break-all text-ink/80">
                {webhookUrl}
              </code>

              <ul className="mt-3 text-xs text-ink/70 space-y-1">
                <li>
                  Activa <span className="font-semibold">Send call stop event</span>{" "}
                  en <span className="font-semibold">yes</span>.
                </li>
                <li>
                  El sistema identificara automaticamente al agente por su
                  extension.
                </li>
                {selectedCreds?.extension_number ? (
                  <li>
                    Extension actual configurada:{" "}
                    <span className="font-semibold">
                      {selectedCreds.extension_number}
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
