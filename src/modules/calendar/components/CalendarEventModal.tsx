import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Client } from "../../../shared/types/crm";
import { clients } from "../../clients/services/clients.service";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import Field from "../../../shared/components/ui/Field";
import Input from "../../../shared/components/ui/Input";
import Textarea from "../../../shared/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../../shared/components/ui/Select";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { formatTimeZoneLabel } from "../../../shared/constants/timezones";
import { cn } from "../../../lib/utils";
import {
  fromLocalDateTimeParts,
  toLocalDateInputValue,
  toLocalTimeInputValue,
} from "../domain/calendar-date";
import CalendarDateTimeField from "./CalendarDateTimeField";
import {
  CALENDAR_STATUS_OPTIONS,
  isScheduledCallOverdue,
  type ScheduledCall,
} from "../types/calendar.types";

type CalendarEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduledCall | null;
  draftDate: Date | null;
  presetClient?: Client | null;
  isAdmin: boolean;
  viewerAgentId: string | null;
  presetAgentId?: string | null;
  targetOperationId?: string | null;
  agentsList: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  viewerTimeZone?: string | null;
  saving: boolean;
  onCreate: (payload: {
    tenant_id?: string | null;
    operation_id?: string | null;
    campaign_id?: string | null;
    client_id: string;
    agent_id: string;
    title?: string | null;
    notes?: string | null;
    outcome_notes?: string | null;
    status?: ScheduledCall["status"];
    scheduled_for: string;
    scheduled_timezone: string;
  }) => Promise<{ error: { message?: string } | null }>;
  onUpdate: (
    id: string,
    payload: Partial<
      Pick<
        ScheduledCall,
        | "agent_id"
        | "campaign_id"
        | "title"
        | "notes"
        | "outcome_notes"
        | "status"
        | "attended_at"
        | "scheduled_for"
        | "scheduled_timezone"
      >
    >,
  ) => Promise<{ error: { message?: string } | null }>;
  onDelete: (id: string) => Promise<{ error: { message?: string } | null }>;
};

export default function CalendarEventModal({
  isOpen,
  onClose,
  event,
  draftDate,
  presetClient,
  isAdmin,
  viewerAgentId,
  presetAgentId,
  targetOperationId,
  agentsList,
  viewerTimeZone,
  saving,
  onCreate,
  onUpdate,
  onDelete,
}: CalendarEventModalProps) {
  const isEditing = Boolean(event);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [status, setStatus] = useState<ScheduledCall["status"]>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [agentId, setAgentId] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextAgentId =
      event?.agent_id ??
      presetClient?.assigned_to ??
      (!isAdmin ? (viewerAgentId ?? "") : (presetAgentId ?? agentsList[0]?.id ?? ""));
    const nextTimeZone =
      event?.scheduled_timezone ?? viewerTimeZone ?? null;

    setSelectedClient(
      event
        ? ({
            id: event.client_id,
            serial: event.client?.serial ?? "",
            first_name: event.client?.first_name,
            last_name: event.client?.last_name,
            campaign_id: event.client?.campaign_id,
            operation_id: event.operation_id,
            tenant_id: event.tenant_id,
            assigned_to: event.agent_id,
          } as Client)
        : (presetClient ?? null),
    );
    setClientQuery("");
    setSearchResults([]);
    setTitle(event?.title ?? "");
    setNotes(event?.notes ?? "");
    setOutcomeNotes(event?.outcome_notes ?? "");
    setStatus(event?.status ?? "scheduled");
    setScheduledDate(
      toLocalDateInputValue(
        event?.scheduled_for ?? draftDate ?? new Date(),
        nextTimeZone,
      ),
    );
    setScheduledTime(
      toLocalTimeInputValue(
        event?.scheduled_for ?? draftDate ?? new Date(),
        nextTimeZone,
      ),
    );
    setAgentId(nextAgentId);
    setSubmitError("");
  }, [
    agentsList,
    draftDate,
    event,
    isAdmin,
    isOpen,
    presetClient,
    presetAgentId,
    viewerTimeZone,
    viewerAgentId,
  ]);

  useEffect(() => {
    if (!isOpen || isEditing) {
      return;
    }

    const q = clientQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchingClients(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearchingClients(true);

      const { data, error } = await clients.search(q, {
        operationId: targetOperationId ?? undefined,
        agentId: isAdmin ? undefined : (viewerAgentId ?? undefined),
        pageSize: 6,
      });

      if (!cancelled) {
        if (error) {
          console.error("Error buscando clientes para agenda:", error);
          setSearchResults([]);
        } else {
          setSearchResults(data ?? []);
        }
        setSearchingClients(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    clientQuery,
    isAdmin,
    isEditing,
    isOpen,
    targetOperationId,
    viewerAgentId,
  ]);

  const selectedClientLabel = useMemo(() => {
    if (!selectedClient) return "";
    return [selectedClient.first_name, selectedClient.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [selectedClient]);

  const agentOptions = useMemo(() => {
    if (isAdmin) return agentsList;

    if (!viewerAgentId) return [];

    const matched = agentsList.find((agent) => agent.id === viewerAgentId);
    if (matched) return [matched];

    return [
      {
        id: viewerAgentId,
        name: "Mi agenda",
        email: "Usuario actual",
      },
    ];
  }, [agentsList, isAdmin, viewerAgentId, viewerTimeZone]);

  const selectedAgentOption = useMemo(
    () => agentOptions.find((agent) => agent.id === agentId) ?? null,
    [agentId, agentOptions],
  );
  const effectiveTimeZone =
    event?.scheduled_timezone ?? viewerTimeZone ?? null;
  const isOverdueEvent = event ? isScheduledCallOverdue(event) : false;

  if (!isOpen) return null;

  const canSubmit =
    Boolean(selectedClient?.id) &&
    Boolean(agentId) &&
    Boolean(scheduledDate) &&
    Boolean(scheduledTime);

  const handleSubmit = async () => {
    if (!selectedClient?.id || !agentId || !scheduledDate || !scheduledTime) {
      setSubmitError("Debes seleccionar cliente, agente y fecha.");
      return;
    }

    setSubmitError("");

    if (isEditing && event) {
      const { error } = await onUpdate(event.id, {
        agent_id: agentId,
        campaign_id: selectedClient.campaign_id ?? null,
        title: title.trim() || null,
        notes: notes.trim() || null,
        outcome_notes: outcomeNotes.trim() || null,
        status,
        scheduled_for: fromLocalDateTimeParts(
          scheduledDate,
          scheduledTime,
          effectiveTimeZone,
        ),
        scheduled_timezone: effectiveTimeZone || "America/Bogota",
      });

      if (error) {
        setSubmitError(error.message ?? "No se pudo actualizar la cita.");
      }

      return;
    }

    const { error } = await onCreate({
      tenant_id: selectedClient.tenant_id ?? null,
      operation_id: selectedClient.operation_id ?? null,
      campaign_id: selectedClient.campaign_id ?? null,
      client_id: selectedClient.id,
      agent_id: agentId,
      title: title.trim() || null,
      notes: notes.trim() || null,
      outcome_notes: outcomeNotes.trim() || null,
      status: "scheduled",
      scheduled_for: fromLocalDateTimeParts(
        scheduledDate,
        scheduledTime,
        effectiveTimeZone,
      ),
      scheduled_timezone: effectiveTimeZone || "America/Bogota",
    });

    if (error) {
      setSubmitError(error.message ?? "No se pudo crear la cita.");
    }
  };

  const handleDeleteClick = async () => {
    if (!event) return;
    const confirmed = window.confirm(
      "Esta cita se eliminara del calendario. Deseas continuar?",
    );
    if (!confirmed) return;

    const { error } = await onDelete(event.id);
    if (error) {
      setSubmitError(error.message ?? "No se pudo eliminar la cita.");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,42,0.42)] p-4 backdrop-blur-sm">
      <ModalPanel className="max-w-[58rem]">
        <ModalHeader
          icon={<CalendarDays className="h-5 w-5 text-brand" />}
          title={isEditing ? "Editar cita" : "Nueva cita en calendario"}
          description={
            isEditing
              ? `${selectedClientLabel || "Cliente"} • ${event?.client?.serial ?? ""}`
              : "Agenda una llamada ligada a cliente y base"
          }
          onClose={onClose}
          closeDisabled={saving}
        />

        <ModalBody className="space-y-5">
          {submitError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {isEditing && isOverdueEvent ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Esta cita ya venció en calendario. Sigue agendada en BD hasta que la marques como atendida, pospuesta o pérdida.
            </div>
          ) : null}

          {!isEditing && !presetClient ? (
            <Field
              label="Buscar cliente"
              hint="Busca por nombre, apellido, serie o correo."
            >
              <div className="space-y-3">
                <Input
                  value={clientQuery}
                  onChange={(event) => setClientQuery(event.target.value)}
                  placeholder="Ej. Alfonso, U00012 o correo..."
                  leftIcon={<Search className="h-4 w-4" />}
                />

                {searchingClients ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <LoadingSpinner size="sm" text="" fullScreen={false} />
                    Buscando clientes...
                  </div>
                ) : null}

                {searchResults.length > 0 ? (
                  <div className="grid gap-2">
                    {searchResults.map((client) => {
                      const label = [client.first_name, client.last_name]
                        .filter(Boolean)
                        .join(" ")
                        .trim();

                      const isActive = selectedClient?.id === client.id;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedClient(client)}
                          className={cn(
                            "rounded-2xl border px-4 py-3 text-left transition",
                            isActive
                              ? "border-brand/30 bg-brand/5 shadow-[0_10px_24px_rgba(59,130,246,0.08)]"
                              : "border-border bg-surface hover:border-brand/20 hover:bg-surface2",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {label || client.serial}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted">
                                {client.serial} • {client.email || client.phone_number || "Sin contacto"}
                              </p>
                            </div>

                            {client.status_code ? (
                              <span className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] font-semibold text-muted">
                                {client.status_code}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </Field>
          ) : null}

          {selectedClient ? (
            <div className="rounded-[1.4rem] border border-border bg-surface2/65 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Cliente seleccionado
                  </p>
                  <p className="mt-2 truncate text-base font-semibold text-ink">
                    {selectedClientLabel || selectedClient.serial}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {selectedClient.serial}
                    {selectedClient.email ? ` • ${selectedClient.email}` : ""}
                  </p>
                </div>

                {selectedClient.campaign_id ? (
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
                    Base vinculada
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título" hint="Opcional. Si lo dejas vacío, se usará el nombre del cliente.">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Seguimiento inicial"
              />
            </Field>

            <Field
              label="Agente"
              required
              hint={isAdmin ? "Selecciona a quién pertenece la cita." : "Tus citas se asignan a tu usuario."}
            >
              <Select
                value={agentId}
                onValueChange={setAgentId}
                disabled={!isAdmin || agentOptions.length === 0}
              >
                <SelectTrigger
                  leftIcon={<UserRound className="h-4 w-4" />}
                  className="min-h-[46px] py-2.5"
                >
                  <span className="truncate font-medium text-ink">
                    {selectedAgentOption?.name ?? "Selecciona un agente"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{agent.name}</span>
                        <span className="truncate text-xs text-muted">
                          {agent.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fecha y hora" required>
              <CalendarDateTimeField
                dateValue={scheduledDate}
                timeValue={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
                disabled={saving}
              />
              <p className="mt-2 text-xs text-muted">
                Hora mostrada en {formatTimeZoneLabel(effectiveTimeZone)}
              </p>
            </Field>

            <Field
              label="Estado"
              hint={!isEditing ? "Las nuevas citas siempre se crean como agendadas." : undefined}
            >
              {isEditing ? (
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ScheduledCall["status"])}
                >
                  <SelectTrigger className="min-h-[52px] bg-surface py-3">
                    <div className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          CALENDAR_STATUS_OPTIONS.find((option) => option.value === status)
                            ?.dotClass,
                        )}
                      />
                      <span className="font-medium text-ink">
                        {CALENDAR_STATUS_OPTIONS.find((option) => option.value === status)
                          ?.label ?? "Estado"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {CALENDAR_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={cn("h-2.5 w-2.5 rounded-full", option.dotClass)}
                          />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex min-h-[52px] items-center rounded-[1.25rem] border border-border bg-surface px-4 py-3">
                  <div className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        CALENDAR_STATUS_OPTIONS[0].dotClass,
                      )}
                    />
                    <span className="font-medium text-ink">
                      {CALENDAR_STATUS_OPTIONS[0].label}
                    </span>
                  </div>
                </div>
              )}
            </Field>
          </div>

          <Field label="Notas internas">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contexto comercial, objetivo de la llamada o recordatorio..."
              className="min-h-[150px]"
            />
          </Field>

          <Field
            label="Resultado / observación"
            hint={
              status === "scheduled"
                ? "Se habilita cuando la cita se marque como atendida, pospuesta o pérdida."
                : undefined
            }
          >
            <Textarea
              value={outcomeNotes}
              onChange={(event) => setOutcomeNotes(event.target.value)}
              placeholder="Qué pasó con la cita o por qué se pospuso/perdió..."
              disabled={status === "scheduled"}
              className={cn(
                "min-h-[110px]",
                status === "scheduled" && "bg-surface2 text-muted",
              )}
            />
          </Field>
        </ModalBody>

        <ModalFooter className="justify-between">
          <div>
            {isEditing ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className={cn(modalSecondaryActionClassName, "text-red-600")}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={modalSecondaryActionClassName}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className={modalPrimaryActionClassName}
              disabled={!canSubmit || saving}
            >
              {saving ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {isEditing ? "Guardar cita" : "Agendar cita"}
            </button>
          </div>
        </ModalFooter>
      </ModalPanel>
    </div>
  );
}
