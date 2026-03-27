import { Info } from "lucide-react";

export default function INFOIMP() {
  return (
    <div
      className="card bg-red-50 border border-red-200"
      role="alert"
      aria-live="polite"
    >
      <h2 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
        <Info className="w-5 h-5 mr-2 text-red-600" />
        Funcionalidades limitadas para agentes
      </h2>

      <div className="space-y-2 text-sm text-red-700">
        <p>
          La funcionalidad de llamadas está deshabilitada debido a
          inconsistencias en la región. Por lo tanto, de forma temporal, los
          agentes no pueden hacer llamadas a través de la acción en la web.
        </p>

        <p className="flex items-start">
          <strong>NO USES LA ACCIÓN DE LLAMAR.</strong>
        </p>

        <p className="text-xs text-red-600 mt-3">
          Consulta con tu Team Leader para establecer cómo debes realizar tus
          llamadas o contacta a soporte en caso de tener algún error en la web.
        </p>
      </div>
    </div>
  );
}
