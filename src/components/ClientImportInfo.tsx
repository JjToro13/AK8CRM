// ClientImportInfo.tsx - Componente informativo sobre la importación de clientes, mostrando instrucciones y requisitos para administradores y agentes.

import { Info, Database, FileText } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function ClientImportInfo() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="card bg-gray-50 border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Info className="w-5 h-5 mr-2 text-gray-600" />
          Importación de Clientes
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            La importación de clientes está disponible solo para
            administradores.
          </p>
          <p>
            Los agentes pueden editar comentarios, estados y enviar emails a los
            clientes asignados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-blue-50 border-blue-200">
      <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
        <Info className="w-5 h-5 mr-2 text-blue-600" />
        Importación de Clientes desde Excel
      </h2>
      <div className="space-y-2 text-sm text-blue-700">
        <p>
          Puedes importar listas de clientes directamente desde archivos Excel
          usando el botón "Importar" arriba.
        </p>
        <p className="flex items-start">
          <FileText className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
          El archivo Excel debe contener las columnas:{" "}
          <strong>
            Nombre, Apellido, Email, Teléfono, País, Empresa, Funnel, Deposit
            Amount, Net Deposit, User Balance
          </strong>
        </p>
        <p className="flex items-start">
          <Database className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
          <strong>NO incluyas</strong> las columnas de color o serie - se
          generarán automáticamente.
        </p>
        <p className="text-xs text-blue-600 mt-3">
          Se generará un número de serie único para cada cliente
          automáticamente.
        </p>
      </div>
    </div>
  );
}
