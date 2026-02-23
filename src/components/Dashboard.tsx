import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Search,
  Users,
  Clock,
  LogOut,
  UserCog,
  X,
  Settings,
} from "lucide-react";
import { clients, calls, auth, Client, Call } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";
import ClientSearch from "./ClientSearch";
import RecentCalls from "./RecentCalls";
import SecurityInfo from "./SecurityInfo";
import EditClientModal from "./EditClientModal";
import AgentManagement from "./AgentManagement";
import AgentDidConfiguration from "./AgentDidConfiguration";
import CampaignManagement from "./CampaignManagement";

interface DashboardProps {
  isAdmin: boolean;
}

export default function Dashboard({ isAdmin }: DashboardProps) {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAgentManagement, setShowAgentManagement] = useState(false);
  const [showDidConfiguration, setShowDidConfiguration] = useState(false);
  const [showCampaignManagement, setShowCampaignManagement] = useState(false);

  // Cargar llamadas recientes al montar el componente
  useEffect(() => {
    loadRecentCalls();
  }, []);

  // Limpiar resultados cuando no hay query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadRecentCalls = async () => {
    setCallsLoading(true);
    try {
      // Los agentes solo ven sus propias llamadas, los admins ven todas
      let agentId: string | undefined;
      if (!isAdmin) {
        const currentUser = await auth.getCurrentUser();
        agentId = currentUser?.id;
      }

      const { data, error } = await calls.getRecent(agentId);
      if (error) {
        console.error("Error cargando llamadas:", error);
      } else {
        setRecentCalls(data || []);
      }
    } catch (error) {
      console.error("Error cargando llamadas:", error);
    } finally {
      setCallsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Si la query está vacía o tiene menos de 2 caracteres, limpiar resultados
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Obtener el ID del usuario actual para agentes
      let agentId: string | undefined;
      if (!isAdmin) {
        const currentUser = await auth.getCurrentUser();
        agentId = currentUser?.id;
      }

      const { data, error } = await clients.search(query, agentId);
      if (error) {
        console.error("Error buscando clientes:", error);
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error("Error buscando clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallStarted = () => {
    // Recargar llamadas recientes después de iniciar una llamada
    loadRecentCalls();
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleClientSaved = () => {
    // Recargar resultados de búsqueda si hay una búsqueda activa y válida
    if (searchQuery && searchQuery.trim().length >= 2) {
      handleSearch(searchQuery);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Call Master
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleSignOut}
                className="btn-secondary flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel de búsqueda y llamadas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Búsqueda de clientes */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Buscar Cliente
              </h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o número de serie..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              {loading && (
                <div className="mt-4 flex justify-center">
                  <LoadingSpinner
                    size="sm"
                    text="Buscando..."
                    fullScreen={false}
                  />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    Resultados de búsqueda:
                  </h3>
                  {searchResults.map((client) => (
                    <ClientSearch
                      key={client.id}
                      client={client}
                      onCallStarted={handleCallStarted}
                      onEditClient={handleEditClient}
                    />
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 &&
                searchResults.length === 0 &&
                !loading && (
                  <div className="mt-4 text-center text-gray-500">
                    No se encontraron clientes con ese criterio
                  </div>
                )}
            </div>

            {/* Llamadas recientes */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Llamadas Recientes
                </h2>
                <Link
                  to="/calls"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Ver todas
                </Link>
              </div>

              {callsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner
                    size="sm"
                    text="Cargando llamadas..."
                    fullScreen={false}
                  />
                </div>
              ) : recentCalls.length > 0 ? (
                <RecentCalls calls={recentCalls.slice(0, 5)} />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No hay llamadas recientes
                </div>
              )}
            </div>
          </div>

          {/* Panel lateral con estadísticas */}
          <div className="space-y-6">
            {/* Estadísticas rápidas */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Estadísticas
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Llamadas hoy</span>
                  <span className="font-semibold text-gray-900">
                    {
                      recentCalls.filter(
                        (call) =>
                          new Date(call.created_at).toDateString() ===
                          new Date().toDateString(),
                      ).length
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">En progreso</span>
                  <span className="font-semibold text-blue-600">
                    {
                      recentCalls.filter(
                        (call) => call.status === "in_progress",
                      ).length
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completadas</span>
                  <span className="font-semibold text-green-600">
                    {
                      recentCalls.filter((call) => call.status === "completed")
                        .length
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sin respuesta</span>
                  <span className="font-semibold text-yellow-600">
                    {
                      recentCalls.filter((call) => call.status === "no_answer")
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Información de seguridad */}
            <SecurityInfo isAdmin={isAdmin} />

            {/* Acciones rápidas */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Acciones Rápidas
              </h2>

              <div className="space-y-3">
                <Link
                  to="/calls"
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Ver Historial
                </Link>

                <Link
                  to="/clients"
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Gestionar Clientes
                </Link>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowAgentManagement(true)}
                      className="w-full btn-secondary flex items-center justify-center"
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Gestionar Agentes
                    </button>

                    <button
                      onClick={() => setShowDidConfiguration(true)}
                      className="w-full btn-primary flex items-center justify-center mt-3"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar Did-glo-bal
                    </button>

                    <button
                      onClick={() => setShowCampaignManagement(true)}
                      className="w-full btn-secondary flex items-center justify-center mt-3"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Gestionar Campañas
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de edición de cliente */}
      <EditClientModal
        client={selectedClient}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleClientSaved}
        isAdmin={isAdmin}
      />

      {/* Modal de gestión de agentes (solo para admins) */}
      {isAdmin && showAgentManagement && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowAgentManagement(false)
          }
        >
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestión de Agentes
                </h1>
              </div>
              <button
                onClick={() => setShowAgentManagement(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <AgentManagement />
            </div>
          </div>
        </div>
      )}

      {/* Modal de configuración de Did-glo-bal (solo para admins) */}
      {isAdmin && showDidConfiguration && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowDidConfiguration(false)
          }
        >
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Configuración de Did-glo-bal
              </h2>
              <button
                onClick={() => setShowDidConfiguration(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <AgentDidConfiguration />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Campañas */}
      {showCampaignManagement && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowCampaignManagement(false)
          }
        >
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-2 text-blue-600" />
                Gestión de Campañas
              </h2>
              <button
                onClick={() => setShowCampaignManagement(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <CampaignManagement />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
