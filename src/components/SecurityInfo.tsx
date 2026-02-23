import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  MessageSquare,
  Settings,
  Users,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface SecurityInfoProps {
  isAdmin: boolean;
}

export default function SecurityInfo({ isAdmin }: SecurityInfoProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("agents")
            .select("name")
            .eq("id", user.id)
            .single();

          if (data?.name) {
            setUserName(data.name);
          } else if (user.user_metadata?.name) {
            setUserName(user.user_metadata.name);
          } else {
            setUserName(user.email?.split("@")[0] || "Usuario");
          }
        }
      } catch (error) {
        console.error("Error cargando nombre del usuario:", error);
      }
    };

    loadUserName();
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">
            Información de Seguridad
          </h2>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {showDetails ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showDetails ? "Ocultar" : "Mostrar"} detalles
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-3 ${isAdmin ? "bg-green-500" : "bg-blue-500"}`}
          />
          <div>
            {userName && (
              <div className="text-sm font-semibold text-gray-900">
                {userName}
              </div>
            )}
            <span className="text-sm font-medium text-gray-600">
              {isAdmin ? "Administrador" : "Agente"}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Permisos de {isAdmin ? "Administrador" : "Agente"}:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                {isAdmin ? (
                  <>
                    <li className="flex items-center">
                      <Users className="h-3 w-3 text-green-600 mr-2" />
                      Acceso completo a todos los datos de clientes
                    </li>
                    <li className="flex items-center">
                      <Lock className="h-3 w-3 text-green-600 mr-2" />
                      Puede ver números de teléfono
                    </li>
                    <li className="flex items-center">
                      <Settings className="h-3 w-3 text-green-600 mr-2" />
                      Gestión completa de clientes (crear, editar, eliminar)
                    </li>
                    <li className="flex items-center">
                      <MessageSquare className="h-3 w-3 text-green-600 mr-2" />
                      Añadir y editar comentarios
                    </li>
                    <li className="flex items-center">
                      <Trash2 className="h-3 w-3 text-green-600 mr-2" />
                      Eliminar clientes
                    </li>
                    <li className="flex items-center">
                      <Lock className="h-3 w-3 text-green-600 mr-2" />
                      Importar listas de clientes desde Excel
                    </li>
                    <li className="flex items-center">
                      <Lock className="h-3 w-3 text-green-600 mr-2" />
                      Exportar listas de clientes
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center">
                      <Users className="h-3 w-3 text-blue-600 mr-2" />
                      Ver datos de clientes asignados
                    </li>
                    <li className="flex items-center">
                      <Lock className="h-3 w-3 text-red-600 mr-2" />
                      No puede ver números de teléfono ni emails
                    </li>
                    <li className="flex items-center">
                      <MessageSquare className="h-3 w-3 text-blue-600 mr-2" />
                      Añadir y editar comentarios de clientes
                    </li>
                    <li className="flex items-center">
                      <Settings className="h-3 w-3 text-blue-600 mr-2" />
                      Cambiar estado/color de clientes
                    </li>
                    <li className="flex items-center">
                      <MessageSquare className="h-3 w-3 text-blue-600 mr-2" />
                      Enviar emails a clientes asignados
                    </li>
                    <li className="flex items-center">
                      <Trash2 className="h-3 w-3 text-red-600 mr-2" />
                      No puede eliminar clientes
                    </li>
                    <li className="flex items-center">
                      <Lock className="h-3 w-3 text-red-600 mr-2" />
                      No puede importar clientes
                    </li>
                    <li className="flex items-center">
                      <Lock className="h-3 w-3 text-red-600 mr-2" />
                      No puede exportar listas de clientes
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Seguridad de Datos
                  </h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    Los datos sensibles (teléfonos y emails) están protegidos
                    por Row-Level Security (RLS). Solo los administradores
                    pueden acceder a información completa de los clientes. Los
                    agentes pueden enviar emails sin ver la dirección de correo
                    del cliente.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <Shield className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Llamadas Enmascaradas
                  </h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Las llamadas se realizan a través de un número proxy para
                    proteger la privacidad de los agentes y clientes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
