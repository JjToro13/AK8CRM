// AgentDetailsModal.tsx - Modal premium para detalles de un agente (clientes + historial llamadas)
// ✅ Portal + am:submodal (apaga modal padre)
// ✅ Overlay blur + panel premium alineado al Dashboard Modal
// ✅ Scroll interno (header fijo)
// ✅ ESC + click afuera para cerrar
// ✅ Compatible con tipificación nueva (status_code) y legacy (status_color)

import { useEffect, useMemo, useState } from "react";
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
    if (!isOpen) return;
    void loadAgentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, agent.id]);

  useEffect(() => {
    if (!isOpen) return;
    void loadAgentCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, agent.id, selectedDate]);

  const loadAgentData = async () => {
    setLoading(true);
    setError("");
    try {
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
    setError("");
    try {
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
        setAgentCalls([]);
        return;
      }

      setAgentCalls(callsData || []);
    } catch (e) {
      console.error("Error cargando llamadas:", e);
      setError("Error inesperado");
      setAgentCalls([]);
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
        return <Clock className="h-4 w-4 text-brand animate-pulse" />;
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

  const totalClients = assignedClients.length;

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
          icon={<User className="w-5 h-5 text-brand" />}
          title={`Detalles de ${agent.name}`}
          description={headerSubtitle}
          onClose={onClose}
          className={agentModalHeaderClass}
        />

        <ModalBody className="min-h-0 space-y-6 overflow-y-auto">
          {error && (
            <div className="rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.78))] px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

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
              <div className="py-12 flex justify-center">
                <LoadingSpinner
                  size="sm"
                  text="Cargando clientes..."
                  fullScreen={false}
                />
              </div>
            ) : totalClients > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedClients.map((client) => {
                  const resolvedStatus = resolveClientStatus(client);

                  return (
                    <div key={client.id} className={cn(agentInsetClass, "p-5")}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate">
                            {client.first_name || client.name || "Sin nombre"}{" "}
                            {client.last_name || ""}
                          </div>
                          <div className="text-xs text-muted truncate">
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

                        {client.email && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-4 w-4 text-muted" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}

                        {client.trading_company && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Building className="h-4 w-4 text-muted" />
                            <span className="truncate">
                              {client.trading_company}
                            </span>
                          </div>
                        )}

                        {client.deposit_amount && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted" />
                            <span className="font-semibold text-ink/80">
                              {formatCurrency(client.deposit_amount)}
                            </span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-white/70 flex items-center justify-between text-xs text-muted">
                          <span>Intentos: {client.attempts}</span>
                          {(client as any).assigned_at ? (
                            <span className="text-brand font-semibold">
                              Asignado: {formatDate((client as any).assigned_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3">
                        <ClientCommentsDropdown clientId={client.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={cn(agentInsetClass, "p-10 text-center")}>
                <div className="h-14 w-14 rounded-2xl bg-white/72 border border-white/76 flex items-center justify-center mx-auto">
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
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-ink/80">
                Historial de llamadas
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Fecha</span>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
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
              <div className="py-10 flex justify-center">
                <LoadingSpinner
                  size="sm"
                  text="Cargando llamadas..."
                  fullScreen={false}
                />
              </div>
            ) : agentCalls.length > 0 ? (
              <div className="space-y-3">
                {agentCalls.map((call) => (
                  <div key={call.id} className={cn(agentInsetClass, "transition p-4 hover:bg-white/72")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">
                          {getStatusIcon(call.status)}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate">
                            {call.client?.first_name || "Cliente desconocido"}
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
              </div>
            ) : (
              <div className={cn(agentInsetClass, "p-10 text-center")}>
                <div className="h-14 w-14 rounded-2xl bg-white/72 border border-white/76 flex items-center justify-center mx-auto">
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

        <ModalFooter className={cn("justify-end max-sm:flex-wrap", agentModalFooterClass)}>
          <button type="button" onClick={onClose} className={modalSecondaryActionClassName}>
              Cerrar
          </button>
        </ModalFooter>
      </ModalPanel>
    </div>,
    document.body,
  );
}
