// AgentDetailsModal.tsx - Modal premium para detalles de un agente (clientes + historial llamadas)
// ✅ Portal + am:submodal (apaga modal padre)
// ✅ Overlay blur + panel premium alineado al Dashboard Modal
// ✅ Scroll interno (header fijo)
// ✅ ESC + click afuera para cerrar
// ✅ Compatible con tipificación nueva (status_code) y legacy (status_color)

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
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
  CalendarDays,
} from "lucide-react";

import { supabase, Agent, Client, Call } from "../../../lib/supabase";
import {
  formatDate,
  formatDuration,
  getStatusColor,
  getStatusText,
  resolveClientStatus,
  getCallStatusText,
  formatCurrency,
} from "../../../lib/utils";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import ClientCommentsDropdown from "../../../shared/components/client/ClientCommentsDropdown";
import Input from "../../../shared/components/ui/Input";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import {
  agentInsetClass,
  agentModalFooterClass,
  agentModalHeaderClass,
  agentModalPanelClass,
} from "./agentUi";

interface AgentDetailsModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const ASSIGNED_CLIENTS_PAGE_SIZE = 12;
const AGENT_CALLS_PAGE_SIZE = 25;

type AgentDetailsClient = Pick<
  Client,
  | "id"
  | "first_name"
  | "last_name"
  | "name"
  | "serial"
  | "email"
  | "trading_company"
  | "deposit_amount"
  | "attempts"
  | "status_color"
  | "status_code"
>;

type AgentDetailsCall = Pick<
  Call,
  | "id"
  | "client_id"
  | "agent_id"
  | "start_time"
  | "end_time"
  | "status"
  | "duration"
  | "created_at"
> & {
  client?: Pick<Client, "id" | "first_name" | "name" | "serial"> | null;
  agent?: Pick<Agent, "id" | "name"> | null;
};

export default function AgentDetailsModal({
  agent,
  isOpen,
  onClose,
}: AgentDetailsModalProps) {
  const [assignedClients, setAssignedClients] = useState<AgentDetailsClient[]>([]);
  const [assignedClientsPage, setAssignedClientsPage] = useState(0);
  const [assignedClientsTotal, setAssignedClientsTotal] = useState(0);
  const [hasMoreAssignedClients, setHasMoreAssignedClients] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMoreClients, setLoadingMoreClients] = useState(false);

  const [agentCalls, setAgentCalls] = useState<AgentDetailsCall[]>([]);
  const [callsPage, setCallsPage] = useState(0);
  const [agentCallsTotal, setAgentCallsTotal] = useState(0);
  const [hasMoreCalls, setHasMoreCalls] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [loadingMoreCalls, setLoadingMoreCalls] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [error, setError] = useState("");

  const loadAgentData = useCallback(
    async (page: number, options?: { reset?: boolean }) => {
      const reset = options?.reset ?? false;

      if (reset) {
        setLoading(true);
        setAssignedClients([]);
        setAssignedClientsPage(0);
      } else {
        setLoadingMoreClients(true);
      }

      setError("");

      try {
        const from = (page - 1) * ASSIGNED_CLIENTS_PAGE_SIZE;
        const to = from + ASSIGNED_CLIENTS_PAGE_SIZE - 1;

        const { data, error, count } = await supabase
          .from("clients")
          .select(
            "id, first_name, last_name, name, serial, email, trading_company, deposit_amount, attempts, status_color, status_code",
            { count: "exact" },
          )
          .eq("assigned_to", agent.id)
          .order("serial", { ascending: true })
          .range(from, to);

        if (error) {
          console.error("Error cargando clientes asignados:", error);
          setError("Error cargando clientes asignados");
          if (reset) {
            setAssignedClients([]);
            setAssignedClientsPage(0);
            setAssignedClientsTotal(0);
            setHasMoreAssignedClients(false);
          }
          return;
        }

        const nextRows = (data ?? []) as AgentDetailsClient[];

        setAssignedClients((prev) => {
          if (reset) return nextRows;

          const seen = new Set(prev.map((client) => client.id));
          const appended = nextRows.filter((client) => !seen.has(client.id));
          return [...prev, ...appended];
        });
        setAssignedClientsPage(page);
        setAssignedClientsTotal(count ?? nextRows.length);
        setHasMoreAssignedClients(
          (count ?? nextRows.length) > page * ASSIGNED_CLIENTS_PAGE_SIZE,
        );
      } catch (err) {
        console.error("Error cargando datos del agente:", err);
        setError("Error inesperado");
        if (reset) {
          setAssignedClients([]);
          setAssignedClientsPage(0);
          setAssignedClientsTotal(0);
          setHasMoreAssignedClients(false);
        }
      } finally {
        if (reset) {
          setLoading(false);
        } else {
          setLoadingMoreClients(false);
        }
      }
    },
    [agent.id],
  );

  const loadAgentCalls = useCallback(
    async (page: number, options?: { reset?: boolean }) => {
      const reset = options?.reset ?? false;

      if (reset) {
        setCallsLoading(true);
        setAgentCalls([]);
        setCallsPage(0);
      } else {
        setLoadingMoreCalls(true);
      }

      setError("");

      try {
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const from = (page - 1) * AGENT_CALLS_PAGE_SIZE;
        const to = from + AGENT_CALLS_PAGE_SIZE - 1;

        const { data: callsData, error: callsError, count } = await supabase
          .from("calls")
          .select(
            `
              id,
              client_id,
              agent_id,
              start_time,
              end_time,
              status,
              duration,
              created_at,
              client:clients(id, first_name, name, serial),
              agent:agents(id, name)
            `,
            { count: "exact" },
          )
          .eq("agent_id", agent.id)
          .gte("start_time", startDate.toISOString())
          .lte("start_time", endDate.toISOString())
          .order("start_time", { ascending: false })
          .range(from, to);

        if (callsError) {
          console.error("Error cargando llamadas:", callsError);
          setError("Error cargando llamadas");
          if (reset) {
            setAgentCalls([]);
            setCallsPage(0);
            setAgentCallsTotal(0);
            setHasMoreCalls(false);
          }
          return;
        }

        const nextRows = ((callsData ?? []) as any[]).map((call) => ({
          ...call,
          client: Array.isArray(call.client)
            ? (call.client[0] ?? null)
            : (call.client ?? null),
          agent: Array.isArray(call.agent)
            ? (call.agent[0] ?? null)
            : (call.agent ?? null),
        })) as AgentDetailsCall[];

        setAgentCalls((prev) => {
          if (reset) return nextRows;

          const seen = new Set(prev.map((call) => call.id));
          const appended = nextRows.filter((call) => !seen.has(call.id));
          return [...prev, ...appended];
        });
        setCallsPage(page);
        setAgentCallsTotal(count ?? nextRows.length);
        setHasMoreCalls((count ?? nextRows.length) > page * AGENT_CALLS_PAGE_SIZE);
      } catch (e) {
        console.error("Error cargando llamadas:", e);
        setError("Error inesperado");
        if (reset) {
          setAgentCalls([]);
          setCallsPage(0);
          setAgentCallsTotal(0);
          setHasMoreCalls(false);
        }
      } finally {
        if (reset) {
          setCallsLoading(false);
        } else {
          setLoadingMoreCalls(false);
        }
      }
    },
    [agent.id, selectedDate],
  );

  useEffect(() => {
    if (!isOpen) return;
    void loadAgentData(1, { reset: true });
  }, [isOpen, agent.id, loadAgentData]);

  useEffect(() => {
    if (!isOpen) return;
    void loadAgentCalls(1, { reset: true });
  }, [isOpen, agent.id, selectedDate, loadAgentCalls]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "no_answer":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 animate-pulse text-brand" />;
      default:
        return <Clock className="h-4 w-4 text-muted" />;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    window.dispatchEvent(
      new CustomEvent("am:submodal", { detail: { open: true } }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("am:submodal", { detail: { open: false } }),
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const loadMoreAssignedClients = async () => {
    if (!hasMoreAssignedClients || loadingMoreClients) return;
    await loadAgentData(assignedClientsPage + 1, { reset: false });
  };

  const loadMoreCalls = async () => {
    if (!hasMoreCalls || loadingMoreCalls) return;
    await loadAgentCalls(callsPage + 1, { reset: false });
  };

  const totalClients = assignedClientsTotal || assignedClients.length;
  const totalCalls = agentCallsTotal || agentCalls.length;

  const headerSubtitle = useMemo(() => {
    const email = (agent.email || "").trim();
    return email ? email : "—";
  }, [agent.email]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

      <ModalPanel
        className={cn(
          agentModalPanelClass,
          "my-auto max-w-6xl",
          "flex max-h-[min(92vh,960px)] w-full flex-col",
        )}
      >
        <ModalHeader
          icon={<User className="h-5 w-5 text-brand" />}
          title={`Detalles de ${agent.name}`}
          description={headerSubtitle}
          onClose={onClose}
          className={agentModalHeaderClass}
        />

        <ModalBody className="min-h-0 space-y-6 overflow-y-auto">
          {error ? (
            <div className="flex items-start gap-2 rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.78))] px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span className="font-semibold">{error}</span>
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink/80">
                Clientes asignados
              </h3>
              <span className="text-xs text-muted">
                {totalClients} en total
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner
                  size="sm"
                  text="Cargando clientes..."
                  fullScreen={false}
                />
              </div>
            ) : totalClients > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assignedClients.map((client) => {
                    const resolvedStatus = resolveClientStatus(client);

                    return (
                      <div key={client.id} className={cn(agentInsetClass, "p-5")}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">
                              {client.first_name || client.name || "Sin nombre"}{" "}
                              {client.last_name || ""}
                            </div>
                            <div className="truncate text-xs text-muted">
                              {client.serial}
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                              <div
                                className={cn(
                                  "status-indicator",
                                  getStatusColor(client),
                                )}
                                title={getStatusText(client)}
                              />
                              <span>{getStatusText(client)}</span>
                              <span className="font-semibold">
                                {resolvedStatus.shortLabel}
                              </span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "status-indicator",
                              getStatusColor(client),
                            )}
                            title="Estado"
                          />
                        </div>

                        <div className="space-y-2 text-sm text-ink/70">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted" />
                            <span className="font-mono text-ink/80">
                              {client.serial}
                            </span>
                          </div>

                          {client.email ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <Mail className="h-4 w-4 text-muted" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          ) : null}

                          {client.trading_company ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <Building className="h-4 w-4 text-muted" />
                              <span className="truncate">
                                {client.trading_company}
                              </span>
                            </div>
                          ) : null}

                          {client.deposit_amount ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted" />
                              <span className="font-semibold text-ink/80">
                                {formatCurrency(client.deposit_amount)}
                              </span>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between border-t border-white/70 pt-2 text-xs text-muted">
                            <span>Intentos: {client.attempts}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <ClientCommentsDropdown clientId={client.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMoreAssignedClients ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadMoreAssignedClients}
                      disabled={loadingMoreClients}
                      className={modalSecondaryActionClassName}
                    >
                      {loadingMoreClients ? "Cargando..." : "Cargar más clientes"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={cn(agentInsetClass, "p-10 text-center")}>
                <div className="crm-shell-pill mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/76 bg-white/72">
                  <User className="h-7 w-7 text-muted" />
                </div>
                <div className="mt-4 text-base font-semibold text-ink">
                  Sin clientes asignados
                </div>
                <div className="mt-2 text-sm text-muted">
                  Este agente no tiene clientes asignados actualmente.
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink/80">
                  Historial de llamadas
                </h3>
                <span className="text-xs text-muted">
                  {totalCalls} en total
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Fecha</span>
                <div className="relative">
                  <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-11"
                  />
                </div>
              </div>
            </div>

            {callsLoading ? (
              <div className="flex justify-center py-10">
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
                    className={cn(agentInsetClass, "p-4 transition hover:bg-surface/72")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5">{getStatusIcon(call.status)}</div>

                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">
                            {call.client?.first_name ||
                              call.client?.name ||
                              "Cliente desconocido"}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                            <span className="font-mono">
                              Serie: {call.client?.serial || "—"}
                            </span>
                            <span>{formatDate(call.start_time)}</span>
                            {call.duration ? (
                              <span>
                                Duración: {formatDuration(call.duration)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs text-muted">
                        {getCallStatusText(call.status)}
                      </span>
                    </div>
                  </div>
                ))}

                {hasMoreCalls ? (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={loadMoreCalls}
                      disabled={loadingMoreCalls}
                      className={modalSecondaryActionClassName}
                    >
                      {loadingMoreCalls ? "Cargando..." : "Cargar más llamadas"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={cn(agentInsetClass, "p-10 text-center")}>
                <div className="crm-shell-pill mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/76 bg-white/72">
                  <Phone className="h-7 w-7 text-muted" />
                </div>
                <div className="mt-4 text-base font-semibold text-ink">
                  Sin llamadas
                </div>
                <div className="mt-2 text-sm text-muted">
                  No hay llamadas para la fecha seleccionada.
                </div>
              </div>
            )}
          </section>
        </ModalBody>

        <ModalFooter
          className={cn("justify-end max-sm:flex-wrap", agentModalFooterClass)}
        >
          <button
            type="button"
            onClick={onClose}
            className={modalSecondaryActionClassName}
          >
            Cerrar
          </button>
        </ModalFooter>
      </ModalPanel>
    </div>,
    document.body,
  );
}
