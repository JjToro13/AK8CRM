import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase, calls as callsService, Call } from "../lib/supabase";
import { formatDate, formatDuration, getCallStatusText } from "../lib/utils";
import LoadingSpinner from "./LoadingSpinner";
import ClientCommentsDropdown from "./ClientCommentsDropdown";

interface CallHistoryProps {
  isAdmin: boolean;
}

export default function CallHistory({ isAdmin: _isAdmin }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    filterCalls();
  }, [calls, searchQuery, statusFilter]);

  const loadCalls = async () => {
    setLoading(true);
    try {
      // Los agentes solo ven sus propias llamadas, los admins ven todas
      let agentId: string | undefined;
      if (!_isAdmin) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        agentId = user?.id;
      }

      const { data, error } = await callsService.getRecent(agentId);
      if (error) {
        console.error("Error cargando llamadas:", error);
      } else {
        setCalls(data || []);
      }
    } catch (error) {
      console.error("Error cargando llamadas:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCalls = () => {
    let filtered = [...calls];

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(
        (call) =>
          (call.client?.first_name || call.client?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          call.client?.serial
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          call.agent?.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Filtrar por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((call) => call.status === statusFilter);
    }

    setFilteredCalls(filtered);
  };

  const handleCallSelect = async (call: Call) => {
    setSelectedCall(call);
  };

  // Función de comentarios eliminada - se usa clients.comments en su lugar

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

  if (loading) {
    return <LoadingSpinner text="Cargando historial de llamadas..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              to="/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver al Dashboard
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              Historial de Llamadas
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de llamadas */}
          <div className="lg:col-span-2">
            <div className="card">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente o agente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completadas</option>
                    <option value="failed">Fallidas</option>
                    <option value="no_answer">Sin respuesta</option>
                  </select>
                </div>
              </div>

              {/* Lista de llamadas */}
              <div className="space-y-3">
                {filteredCalls.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {searchQuery || statusFilter !== "all"
                      ? "No se encontraron llamadas con esos filtros"
                      : "No hay llamadas registradas"}
                  </div>
                ) : (
                  filteredCalls.map((call) => (
                    <div
                      key={call.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedCall?.id === call.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => handleCallSelect(call)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(call.status)}
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {call.client?.first_name || "Cliente desconocido"}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Serie: {call.client?.serial}</span>
                              <span>Agente: {call.agent?.name}</span>
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
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Panel de detalles */}
          <div className="space-y-6">
            {selectedCall ? (
              <>
                {/* Detalles de la llamada */}
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Detalles de la Llamada
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Cliente:</span>
                      <p className="font-medium">
                        {selectedCall.client?.first_name ||
                          selectedCall.client?.name ||
                          "No disponible"}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm text-gray-600">Serie:</span>
                      <p className="font-medium">
                        {selectedCall.client?.serial}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm text-gray-600">Agente:</span>
                      <p className="font-medium">{selectedCall.agent?.name}</p>
                    </div>

                    <div>
                      <span className="text-sm text-gray-600">Inicio:</span>
                      <p className="font-medium">
                        {formatDate(selectedCall.start_time)}
                      </p>
                    </div>

                    {selectedCall.end_time && (
                      <div>
                        <span className="text-sm text-gray-600">Fin:</span>
                        <p className="font-medium">
                          {formatDate(selectedCall.end_time)}
                        </p>
                      </div>
                    )}

                    {selectedCall.duration && (
                      <div>
                        <span className="text-sm text-gray-600">Duración:</span>
                        <p className="font-medium">
                          {formatDuration(selectedCall.duration)}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-sm text-gray-600">Estado:</span>
                      <div className="flex items-center">
                        {getStatusIcon(selectedCall.status)}
                        <span className="ml-2 font-medium">
                          {getCallStatusText(selectedCall.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comentarios del cliente */}
                {selectedCall.client && (
                  <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Comentarios del Cliente
                    </h2>
                    <ClientCommentsDropdown clientId={selectedCall.client.id} />
                  </div>
                )}
              </>
            ) : (
              <div className="card">
                <div className="text-center text-gray-500 py-8">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Selecciona una llamada para ver los detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
