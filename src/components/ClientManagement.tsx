// ClientManagement.tsx - Gestión de clientes con scroll interno, polling silencioso (admin),
// sticky header + sticky columna Acciones, persistencia de búsqueda,
// indicador de refresco y resaltado de prioridad.
// ✅ CAMBIOS:
// - Quitado Importar/Exportar y el ImportClientsModal (ahora vive en CampaignManagement)

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Phone,
  Send,
  LockKeyholeIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  supabase,
  clients as clientsService,
  agentAssignments,
} from "../lib/supabase";
import { Client } from "../lib/supabase";
import {
  formatDate,
  getStatusColor,
  getStatusText,
  formatCurrency,
} from "../lib/utils";
import LoadingSpinner from "./LoadingSpinner";
import EditClientModal from "./EditClientModal";
import EmailModal from "./EmailModal";
import ClientCommentsCell from "./ClientCommentsCell";
import { useAuth } from "../hooks/useAuth";
import ReportToAdminWidget from "./ReportToAdminWidget";
import GeneralNoticeModal from "./GeneralNoticeModal";
import { submitAdminReport } from "../lib/submitAdminReport";
import InfoIMP from "./INFOIMP";

const NOTICE_COOLDOWN_KEY = "general_notice_last_seen_v1";
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const CLIENTS_SEARCH_KEY = "clients_search_v1";

interface ClientManagementProps {
  isAdmin?: boolean;
}

export default function ClientManagement({
  isAdmin: propIsAdmin,
}: ClientManagementProps = {}) {
  const { isAdmin: hookIsAdmin } = useAuth();
  const isAdmin = propIsAdmin ?? hookIsAdmin;

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());
  const [, setTick] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedClientForEmail, setSelectedClientForEmail] =
    useState<Client | null>(null);

  const [error, setError] = useState("");
  const [callingClient, setCallingClient] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  // ✅ Modal para "Llamar" (se muestra SIEMPRE al click)
  const [callNoticeOpen, setCallNoticeOpen] = useState(false);
  const openCallNotice = () => setCallNoticeOpen(true);
  const closeCallNotice = () => setCallNoticeOpen(false);

  const ENABLE_CALLS = import.meta.env.VITE_ENABLE_CALLS === "true";

  const [copyToast, setCopyToast] = useState<{ show: boolean; text: string }>({
    show: false,
    text: "",
  });

  // --- Referencias para polling y scroll interno ---
  const pollTimerRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);

  // --- Aviso general cada 24h ---
  useEffect(() => {
    try {
      const lastSeenRaw = localStorage.getItem(NOTICE_COOLDOWN_KEY);
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
      const now = Date.now();

      if (
        !lastSeen ||
        Number.isNaN(lastSeen) ||
        now - lastSeen >= HOURS_24_MS
      ) {
        setNoticeOpen(true);
      }
    } catch {
      setNoticeOpen(true);
    }
  }, []);

  const handleCloseNotice = () => {
    try {
      localStorage.setItem(NOTICE_COOLDOWN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setNoticeOpen(false);
  };

  // --- Restaurar búsqueda guardada ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLIENTS_SEARCH_KEY);
      if (saved) setSearchQuery(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Persistir búsqueda con debounce ---
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(CLIENTS_SEARCH_KEY, searchQuery);
      } catch {}
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  // --- Tick para "Actualizado hace Xs" (solo UI) ---
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback abajo
    }

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const showCopyToast = (text: string) => {
    setCopyToast({ show: true, text });
    window.setTimeout(() => setCopyToast({ show: false, text: "" }), 1600);
  };

  const handleCopy = async (label: string, value?: string | null) => {
    const text = (value ?? "").trim();
    if (!text) return;

    const ok = await copyToClipboard(text);
    if (!ok) {
      setError(`No se pudo copiar ${label}`);
      return;
    }

    showCopyToast(`${label} copiado`);
  };

  const loadClients = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (silent) setRefreshing(true);
    else setInitialLoading(true);

    try {
      console.log("loadClients - isAdmin:", isAdmin);

      if (isAdmin) {
        const { data, error } = await clientsService.getAll();
        if (error) {
          console.error("Error cargando clientes:", error);
          setError("Error cargando clientes");
        } else {
          setClients(data || []);
          setLastUpdatedAt(Date.now());
        }
      } else {
        const currentUser = await supabase.auth.getUser();
        if (!currentUser.data.user) {
          setError("No se pudo obtener la información del usuario");
          return;
        }

        const { data: assignedClients, error } =
          await agentAssignments.getAssignedClients(currentUser.data.user.id);

        if (error) {
          console.error("Error cargando clientes asignados:", error);
          setError("Error cargando clientes asignados");
        } else {
          setClients(assignedClients || []);
          setLastUpdatedAt(Date.now());
        }
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
      setError("Error cargando clientes");
    } finally {
      if (silent) setRefreshing(false);
      else setInitialLoading(false);
    }
  };

  // --- Refresco preservando scroll interno ---
  const refreshClientsPreservingScroll = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    const el = tableScrollRef.current;
    const prevScrollTop = el?.scrollTop ?? lastScrollTopRef.current ?? 0;

    await loadClients({ silent: true });

    requestAnimationFrame(() => {
      const el2 = tableScrollRef.current;
      if (el2) el2.scrollTop = prevScrollTop;
      isRefreshingRef.current = false;
    });
  };

  // --- Carga inicial + polling 45s (solo admin y sin modales abiertos) ---
  useEffect(() => {
    loadClients();

    const shouldPoll = isAdmin && !showEditModal && !showEmailModal;

    if (shouldPoll) {
      pollTimerRef.current = window.setInterval(() => {
        refreshClientsPreservingScroll();
      }, 45_000);
    }

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showEditModal, showEmailModal]);

  // --- Filtrado según búsqueda ---
  useEffect(() => {
    let filtered = [...clients];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          (client.first_name || client.name || "").toLowerCase().includes(q) ||
          client.serial.toLowerCase().includes(q) ||
          client.email?.toLowerCase().includes(q) ||
          (client.source || client.trading_company || "")
            .toLowerCase()
            .includes(q),
      );
    }

    setFilteredClients(filtered);
  }, [clients, searchQuery]);

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (error) {
        console.error("Error eliminando cliente:", error);
        setError("Error eliminando cliente");
      } else {
        loadClients({ silent: true });
      }
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      setError("Error eliminando cliente");
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleClientSaved = () => loadClients({ silent: true });

  const handleCallClient = async (client: Client) => {
    setCallingClient(client.id);
    setError("");

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        setError("No se pudo obtener la información del agente");
        return;
      }

      const { data, error } = await supabase.functions.invoke("start-call", {
        body: {
          client_id: client.id,
          agent_id: currentUser.data.user.id,
        },
      });

      if (error) {
        setError(error.message || "Error al iniciar la llamada");
      } else if (data && data.call_id) {
        alert(
          `✅ Llamada iniciada con éxito\n\n` +
            `Cliente: ${data.client_name} (${data.client_serial})\n` +
            `Extensión: ${data.extension_number}\n\n` +
            `La llamada sonará en tu softphone (MicroSIP/Zoiper)`,
        );
        loadClients({ silent: true });
      }
    } catch (err) {
      setError("Error inesperado al iniciar la llamada");
      console.error("Error iniciando llamada:", err);
    } finally {
      setCallingClient(null);
    }
  };

  const handleEmailClient = (client: Client) => {
    setSelectedClientForEmail(client);
    setShowEmailModal(true);
  };

  if (initialLoading) {
    return <LoadingSpinner text="Cargando clientes..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver al Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Gestión de Clientes
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              {/* Sin acciones globales */}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        <ReportToAdminWidget
          page="Clients"
          onSubmitReport={(payload) => submitAdminReport(supabase, payload)}
        />

        {/* ✅ Aviso general (cada 24h) */}
        <GeneralNoticeModal
          open={noticeOpen}
          onClose={handleCloseNotice}
          variant="warning"
          title="Aviso general"
          message={
            <>
              <p className="mb-2">
                Algunas funcionalidades pueden estar temporalmente limitadas.
              </p>
              <p className="text-sm">
                Si detectás un error, usá el botón de reporte abajo a la
                izquierda.
              </p>
            </>
          }
          primaryText="Listo"
        />

        {/* ✅ Modal del botón Llamar (siempre al click) */}
        <GeneralNoticeModal
          open={callNoticeOpen}
          onClose={closeCallNotice}
          variant="warning"
          title="Función en revisión"
          message={
            <>
              <p className="mb-2">Esta función está en revisión.</p>
              <p className="text-sm">
                Si tienes dudas de cómo realizar tus llamadas, comunícate con tu
                Team Leader.
              </p>
            </>
          }
          primaryText="Entendido"
        />

        {/* Información de roja*/}
        <div className="mb-6">
          <InfoIMP />
        </div>

        {/* Filtros y búsqueda */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar clientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {isAdmin ? (
                  <span className="flex items-center">
                    <LockKeyholeIcon className="w-4 h-4 text-green-600 mr-1" />
                    información visible (Administrador)
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LockKeyholeIcon className="w-4 h-4 text-orange-600 mr-1" />
                    información visible (Temporal para Agentes)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de clientes */}
        <div className="card">
          {/* Indicador de scroll horizontal */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              <span>Desliza horizontalmente para ver más columnas</span>
              <svg
                className="w-3 h-3 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
          </div>

          {/* Estado de actualización */}
          <div className="mb-2 flex items-center justify-end gap-2">
            {refreshing && (
              <span className="text-xs text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
                Actualizando…
              </span>
            )}
            <span className="text-xs text-gray-500">
              Actualizado hace {Math.floor((Date.now() - lastUpdatedAt) / 1000)}
              s
            </span>
          </div>

          <div
            ref={tableScrollRef}
            onScroll={() => {
              if (tableScrollRef.current) {
                lastScrollTopRef.current = tableScrollRef.current.scrollTop;
              }
            }}
            className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-lg border border-gray-100"
          >
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead>
                <tr>
                  <th
                    className={[
                      "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                      "sticky top-0 left-0 z-40",
                      "bg-gray-50 border-r border-gray-200",
                      "min-w-[140px]",
                    ].join(" ")}
                  >
                    Acciones
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Apellido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    País
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Funnel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Deposit Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Net Deposit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    User Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Fecha Inversión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Serie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Intentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50 w-[320px] min-w-[320px]">
                    Comentarios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-30 bg-gray-50">
                    Fecha Creación
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const isHighValue =
                    (client.net_deposit ?? 0) >= 500 ||
                    (client.deposit_amount ?? 0) >= 500;
                  const isManyAttempts = (client.attempts ?? 0) >= 3;

                  // ✅ Barra de prioridad SIEMPRE visible (vive en la celda sticky)
                  const priorityBarClass = isManyAttempts
                    ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-400"
                    : isHighValue
                      ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-400"
                      : "";

                  return (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-gray-50 h-[80px]"
                    >
                      {/* ACCIONES (sticky) */}
                      <td
                        className={[
                          "px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-20 bg-white",
                          "border-r border-gray-200",
                          "min-w-[140px]",
                          "relative",
                          priorityBarClass,
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2">
                          {/* Call: siempre visible */}
                          <button
                            onClick={() =>
                              ENABLE_CALLS
                                ? handleCallClient(client)
                                : openCallNotice()
                            }
                            disabled={
                              ENABLE_CALLS && callingClient === client.id
                            }
                            className="text-green-600 hover:text-green-900 disabled:opacity-60"
                            title="Llamar"
                          >
                            {ENABLE_CALLS && callingClient === client.id ? (
                              <LoadingSpinner
                                size="sm"
                                text=""
                                fullScreen={false}
                              />
                            ) : (
                              <Phone className="h-4 w-4" />
                            )}
                          </button>

                          {/* Email: siempre visible si existe */}
                          {client.email && (
                            <button
                              onClick={() => handleEmailClient(client)}
                              className="text-blue-600 hover:text-blue-900 opacity-90 hover:opacity-100"
                              title="Enviar email"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}

                          {/* Editar: siempre visible */}
                          <button
                            onClick={() => handleEditClient(client)}
                            className="text-gray-700 hover:text-gray-900 opacity-90 hover:opacity-100"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* Eliminar: solo admin */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="text-red-600 hover:text-red-900 opacity-90 hover:opacity-100"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`status-indicator ${getStatusColor(client.status_color)}`}
                          />
                          <span className="text-sm text-gray-900">
                            {getStatusText(client.status_color)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.first_name || "Sin nombre"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.last_name || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.email ? (
                          <button
                            type="button"
                            onClick={() => handleCopy("Email", client.email)}
                            className="text-sm text-gray-900 hover:text-blue-700 underline decoration-dotted underline-offset-2"
                            title="Click para copiar email"
                          >
                            {client.email}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-900">-</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.phone_number ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy("Teléfono", client.phone_number)
                            }
                            className="text-sm text-gray-900 hover:text-blue-700 underline decoration-dotted underline-offset-2"
                            title="Click para copiar teléfono"
                          >
                            {client.phone_number}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-900">-</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.country || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.source || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.funnel || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.deposit_amount
                            ? formatCurrency(client.deposit_amount)
                            : "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.net_deposit
                            ? formatCurrency(client.net_deposit)
                            : "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.user_balance
                            ? formatCurrency(client.user_balance)
                            : "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.investment_date || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {client.serial}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.attempts}
                        </div>
                      </td>

                      <td className="px-6 py-4 w-[320px] min-w-[320px] align-middle">
                        <div className="h-[65px] overflow-hidden">
                          <ClientCommentsCell clientId={client.id} />
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(client.created_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              {searchQuery
                ? "No se encontraron clientes con ese criterio"
                : "No hay clientes registrados"}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <EditClientModal
        client={selectedClient}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleClientSaved}
        isAdmin={isAdmin}
      />

      {selectedClientForEmail && (
        <EmailModal
          client={selectedClientForEmail}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nuevo Cliente</h2>
            <p className="text-gray-600">Funcionalidad en desarrollo</p>
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 btn-primary w-full"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {copyToast.show && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80]">
          <div className="flex items-center gap-2 rounded-xl bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
            <span className="text-green-400">✅</span>
            <span>{copyToast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
