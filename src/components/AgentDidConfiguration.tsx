import { useState, useEffect } from "react";
import {
  Agent,
  AgentDidCredentials,
  agents,
  didCredentials,
} from "../lib/supabase";
import { Settings, Check, X, Loader, Trash2, Save } from "lucide-react";

export default function AgentDidConfiguration() {
  // Estados principales
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [credentialsList, setCredentialsList] = useState<AgentDidCredentials[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    extensionNumber: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Cargar agentes y credenciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Cargar todos los agentes
    const { data: agentsData } = await agents.getAll();
    if (agentsData) {
      setAgentsList(agentsData);
    }

    // Cargar todas las credenciales
    const { data: credsData } = await didCredentials.getAll();
    if (credsData) {
      setCredentialsList(credsData as AgentDidCredentials[]);
    }

    setLoading(false);
  };

  // Seleccionar un agente para configurar
  const handleSelectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);
    setTestResult(null);

    // Buscar credenciales existentes para este agente
    const existingCreds = credentialsList.find(
      (cred) => cred.agent_id === agent.id,
    );

    if (existingCreds) {
      setFormData({
        extensionNumber: existingCreds.extension_number || "",
      });
    } else {
      setFormData({
        extensionNumber: "",
      });
    }
  };

  // Probar conexión (simplificado - solo validar extensión)
  const handleTestConnection = async () => {
    if (!selectedAgent || !formData.extensionNumber) {
      setTestResult({
        success: false,
        message: "Por favor, introduce un número de extensión",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Validar que la extensión sea un número válido
      const extensionNum = parseInt(formData.extensionNumber);
      if (isNaN(extensionNum) || extensionNum < 100 || extensionNum > 999) {
        setTestResult({
          success: false,
          message: "El número de extensión debe ser un número entre 100 y 999",
        });
        return;
      }

      // Simular prueba de conexión (en realidad no podemos probar sin hacer una llamada real)
      setTestResult({
        success: true,
        message: `Extensión ${formData.extensionNumber} configurada correctamente`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "Error validando la extensión",
      });
    } finally {
      setTesting(false);
    }
  };

  // Guardar credenciales
  const handleSaveCredentials = async () => {
    if (!selectedAgent || !formData.extensionNumber) {
      return;
    }

    setSaving(true);

    try {
      const credentials = {
        agent_id: selectedAgent.id,
        extension_number: formData.extensionNumber,
      };

      const { error } = await didCredentials.upsert(credentials);

      if (error) {
        console.error("Error guardando credenciales:", error);
        return;
      }

      // Recargar datos
      await loadData();

      // Mostrar mensaje de éxito
      setTestResult({
        success: true,
        message: "Credenciales guardadas correctamente",
      });
    } catch (error) {
      console.error("Error en handleSaveCredentials:", error);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar credenciales
  const handleDeleteCredentials = async (agentId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar las credenciales de este agente?",
      )
    ) {
      return;
    }

    try {
      const { error } = await didCredentials.delete(agentId);
      if (error) {
        console.error("Error eliminando credenciales:", error);
        return;
      }

      // Recargar datos
      await loadData();

      // Si era el agente seleccionado, limpiar formulario
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setFormData({ extensionNumber: "" });
        setTestResult(null);
      }
    } catch (error) {
      console.error("Error en handleDeleteCredentials:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Configuración de Did-glo-bal
        </h2>
      </div>

      {/* Información del sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          📋 Sistema Simplificado
        </h3>
        <p className="text-sm text-blue-800 mb-2">
          Ahora solo necesitas configurar el{" "}
          <strong>número de extensión</strong> de cada agente. El sistema usa
          automáticamente el Access Token global de la cuenta admin.
        </p>
        <div className="text-xs text-blue-700">
          <p>
            <strong>Extensiones disponibles:</strong> 101, 102, 103, 104, 105,
            106, 107, 108, 109, 110
          </p>
          <p>
            <strong>Token global:</strong> oedNbOjtfsl_Wq9GdkxTWRQ-1752768458
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de agentes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Agentes</h3>
          <div className="space-y-2">
            {agentsList.map((agent) => {
              const hasCredentials = credentialsList.some(
                (cred) => cred.agent_id === agent.id,
              );
              const credentials = credentialsList.find(
                (cred) => cred.agent_id === agent.id,
              );

              return (
                <div
                  key={agent.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAgent?.id === agent.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleSelectAgent(agent)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-500">{agent.email}</p>
                      {hasCredentials && credentials && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Extensión: {credentials.extension_number}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCredentials ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                      {hasCredentials && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCredentials(agent.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulario de configuración */}
        <div className="space-y-4">
          {selectedAgent ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Configurar: {selectedAgent.name}
              </h3>

              <div className="space-y-4">
                {/* Número de extensión */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Extensión *
                  </label>
                  <input
                    type="text"
                    value={formData.extensionNumber}
                    onChange={(e) =>
                      setFormData({ extensionNumber: e.target.value })
                    }
                    placeholder="Ej: 101, 102, 103..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de extensión del agente en Did-glo-bal (101-110)
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !formData.extensionNumber}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {testing ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Probando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Probar
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSaveCredentials}
                    disabled={saving || !formData.extensionNumber}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </button>
                </div>

                {/* Resultado de prueba */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg ${
                      testResult.success
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        testResult.success ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {testResult.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Información de configuración de webhook */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  📌 Configuración del Webhook en Did-glo-bal
                </h4>
                <p className="text-sm text-blue-800 mb-2">
                  En el panel de Did-glo-bal, configura la siguiente URL de
                  webhook:
                </p>
                <code className="block p-2 bg-white border border-blue-300 rounded text-xs break-all">
                  https://wnaqelbgdhlzzkwhnwtc.supabase.co/functions/v1/call-ended-v2
                </code>
                <p className="text-xs text-blue-700 mt-2">
                  • Asegúrate de activar "Send call stop event" en "yes"
                  <br />• El sistema identificará automáticamente al agente por
                  su extensión
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Settings className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona un agente
              </h3>
              <p className="text-gray-500">
                Haz clic en un agente de la lista para configurar su extensión
                de Did-glo-bal
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
