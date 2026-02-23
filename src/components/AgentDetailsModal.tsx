// AgentDetailsModal.tsx - Modal para mostrar detalles de un agente, incluyendo clientes asignados y historial de llamadas.

import { useState, useEffect } from "react";
import {
  X,
  Phone,
  Clock,
  User,
  Hash,
  Mail,
  Building,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase, Agent, Client, Call } from "../lib/supabase";
import {
  formatDate,
  formatDuration,
  getStatusColor,
  getCallStatusText,
  formatCurrency,
} from "../lib/utils";
import LoadingSpinner from "./LoadingSpinner";
import ClientCommentsDropdown from "./ClientCommentsDropdown";

interface AgentDetailsModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentDetailsModal({
  agent,
  isOpen,
  onClose,
}: AgentDetailsModalProps) {
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [agentCalls, setAgentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [callsLoading, setCallsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadAgentData();
    }
  }, [isOpen, agent.id]);

  useEffect(() => {
    if (isOpen) {
      loadAgentCalls();
    }
  }, [isOpen, agent.id, selectedDate]);

  const loadAgentData = async () => {
    setLoading(true);
    setError("");
    try {
      // ✅ NUEVO: cargar clientes asignados por assigned_to
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("assigned_to", agent.id)
        .order("serial", { ascending: true });

      if (error) {
        console.error("Error cargando clientes asignados:", error);
        setError("Error cargando clientes asignados");
        setAssignedClients([]);
        return;
      }

      setAssignedClients((data as Client[]) || []);
    } catch (err) {
      console.error("Error cargando datos del agente:", err);
      setError("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const loadAgentCalls = async () => {
    setCallsLoading(true);
    try {
      // Cargar llamadas del agente para la fecha seleccionada
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data: callsData, error: callsError } = await supabase
        .from("calls")
        .select(
          `
          *,
          client:clients(*),
          agent:agents(*)
        `,
        )
        .eq("agent_id", agent.id)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: false });

      if (callsError) {
        console.error("Error cargando llamadas:", callsError);
        setError("Error cargando llamadas");
        return;
      }

      setAgentCalls(callsData || []);
    } catch (error) {
      console.error("Error cargando llamadas:", error);
      setError("Error inesperado");
    } finally {
      setCallsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "no_answer":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Detalles de {agent.name}
              </h2>
              <p className="text-sm text-gray-600">{agent.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Clientes asignados */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Clientes Asignados ({assignedClients.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner
                  size="sm"
                  text="Cargando clientes..."
                  fullScreen={false}
                />
              </div>
            ) : assignedClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        {client.first_name || client.name || "Sin nombre"}{" "}
                        {client.last_name || ""}
                      </h4>
                      <div
                        className={`status-indicator ${getStatusColor(client.status_color)}`}
                      />
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        {client.serial}
                      </div>

                      {client.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {client.email}
                        </div>
                      )}

                      {client.trading_company && (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2" />
                          {client.trading_company}
                        </div>
                      )}

                      {client.deposit_amount && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2" />
                          {formatCurrency(client.deposit_amount)}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Intentos: {client.attempts}
                        </span>
                        {(client as any).assigned_at && (
                          <span className="text-xs text-blue-600">
                            Asignado: {formatDate((client as any).assigned_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ClientCommentsDropdown clientId={client.id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay clientes asignados a este agente</p>
              </div>
            )}
          </div>

          {/* Historial de llamadas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Historial de Llamadas
              </h3>
              <div className="flex items-center space-x-3">
                <label
                  htmlFor="date"
                  className="text-sm font-medium text-gray-700"
                >
                  Fecha:
                </label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>

            {callsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner
                  size="sm"
                  text="Cargando llamadas..."
                  fullScreen={false}
                />
              </div>
            ) : agentCalls.length > 0 ? (
              <div className="space-y-3">
                {agentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(call.status)}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {call.client?.first_name || "Cliente desconocido"}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Serie: {call.client?.serial}</span>
                            <span>{formatDate(call.start_time)}</span>
                            {call.duration && (
                              <span>
                                Duración: {formatDuration(call.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {getCallStatusText(call.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay llamadas para la fecha seleccionada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
