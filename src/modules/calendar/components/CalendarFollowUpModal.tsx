import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCheck,
  Clock3,
  Copy,
  FileText,
  Mail,
  PencilLine,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { notify } from "../../../shared/lib/notify";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import Field from "../../../shared/components/ui/Field";
import Textarea from "../../../shared/components/ui/Textarea";
import { formatTimeZoneLabel } from "../../../shared/constants/timezones";
import {
  calendarInsetClass,
  calendarModalFooterClass,
  calendarModalHeaderClass,
  calendarModalPanelClass,
} from "./calendarUi";
import {
  formatDateTimeLabel,
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

type FollowUpStatus = Extract<
  ScheduledCall["status"],
  "attended" | "postponed" | "missed"
>;

type CalendarFollowUpModalProps = {
  isOpen: boolean;
  event: ScheduledCall | null;
  saving: boolean;
  onClose: () => void;
  onOpenEdit: (event: ScheduledCall) => void;
  onUpdate: (
    id: string,
    payload: Partial<
      Pick<
        ScheduledCall,
        | "status"
        | "outcome_notes"
        | "attended_at"
        | "scheduled_for"
        | "scheduled_timezone"
      >
    >,
  ) => Promise<{ error: { message?: string } | null }>;
};

const FOLLOW_UP_ACTIONS: Array<{
  value: FollowUpStatus;
  label: string;
  description: string;
  icon: typeof CheckCheck;
  activeClassName: string;
}> = [
  {
    value: "attended",
    label: "Atendida",
    description: "Cierra la cita como gestionada.",
    icon: CheckCheck,
    activeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_10px_24px_rgba(16,185,129,0.12)]",
  },
  {
    value: "postponed",
    label: "Posponer",
    description: "Reagenda la cita manteniendo su seguimiento.",
    icon: CalendarDays,
    activeClassName:
      "border-violet-200 bg-violet-50 text-violet-700 shadow-[0_10px_24px_rgba(139,92,246,0.12)]",
  },
  {
    value: "missed",
    label: "Pérdida",
    description: "Marca la cita como no concretada.",
    icon: XCircle,
    activeClassName:
      "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_10px_24px_rgba(244,63,94,0.12)]",
  },
];

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
  return Promise.resolve();
}

function ContactCopyRow({
  icon,
  value,
  label,
  onCopy,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3 py-2 text-left transition hover:border-brand/20 hover:bg-white"
      title={`Copiar ${label.toLowerCase()}`}
    >
      <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
        <span className="shrink-0 text-muted">{icon}</span>
        <span className="truncate text-ink/85">{value}</span>
      </span>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-surface2 text-muted">
        <Copy className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export default function CalendarFollowUpModal({
  isOpen,
  event,
  saving,
  onClose,
  onOpenEdit,
  onUpdate,
}: CalendarFollowUpModalProps) {
  const [actionStatus, setActionStatus] = useState<FollowUpStatus | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen || !event) return;

    const persistedStatus =
      event.status === "attended" ||
      event.status === "postponed" ||
      event.status === "missed"
        ? event.status
        : null;

    setActionStatus(persistedStatus);
    setOutcomeNotes(event.outcome_notes ?? "");
    setScheduledDate(
      toLocalDateInputValue(event.scheduled_for, event.scheduled_timezone),
    );
    setScheduledTime(
      toLocalTimeInputValue(event.scheduled_for, event.scheduled_timezone),
    );
    setSubmitError("");
  }, [event, isOpen]);

  const clientLabel = useMemo(() => {
    if (!event) return "";
    return [event.client?.first_name, event.client?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [event]);

  const currentStatus = useMemo(() => {
    if (!event) return null;
    return (
      CALENDAR_STATUS_OPTIONS.find((option) => option.value === event.status) ??
      null
    );
  }, [event]);

  const handleCopy = async (label: string, value?: string | null) => {
    const text = value?.trim();
    if (!text) return;

    try {
      await copyToClipboard(text);
      notify.copied(label);
    } catch {
      //
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    if (!isOpen) return;

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, saving]);

  if (!isOpen || !event) return null;

  const eventTimeZone = event.scheduled_timezone || "America/Bogota";
  const isOverdue = isScheduledCallOverdue(event);
  const selectedActionMeta = actionStatus
    ? FOLLOW_UP_ACTIONS.find((action) => action.value === actionStatus) ?? null
    : null;
  const canSubmit =
    Boolean(actionStatus) &&
    (actionStatus !== "postponed" ||
      (Boolean(scheduledDate) && Boolean(scheduledTime)));

  const handleSubmit = async () => {
    if (!actionStatus) {
      setSubmitError("Selecciona el resultado del seguimiento.");
      return;
    }

    if (actionStatus === "postponed" && (!scheduledDate || !scheduledTime)) {
      setSubmitError("Indica la nueva fecha y hora para la cita.");
      return;
    }

    setSubmitError("");

    const payload: Partial<
      Pick<
        ScheduledCall,
        | "status"
        | "outcome_notes"
        | "attended_at"
        | "scheduled_for"
        | "scheduled_timezone"
      >
    > = {
      status: actionStatus === "postponed" ? "scheduled" : actionStatus,
      outcome_notes: outcomeNotes.trim() || null,
      attended_at:
        actionStatus === "attended" ? new Date().toISOString() : null,
    };

    if (actionStatus === "postponed") {
      payload.scheduled_for = fromLocalDateTimeParts(
        scheduledDate,
        scheduledTime,
        eventTimeZone,
      );
      payload.scheduled_timezone = eventTimeZone;
    }

    const { error } = await onUpdate(event.id, payload);
    if (error) {
      setSubmitError(error.message ?? "No se pudo guardar el seguimiento.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      onMouseDown={(overlayEvent) => {
        if (saving) return;
        if (overlayEvent.target === overlayEvent.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

      <ModalPanel className={cn(calendarModalPanelClass, "max-w-[56rem]")}>
        <ModalHeader
          icon={<Clock3 className="h-5 w-5 text-brand" />}
          title="Seguimiento de cita"
          description={`${clientLabel || event.client?.serial || "Cliente"} · ${event.client?.serial ?? ""}`}
          onClose={onClose}
          closeDisabled={saving}
          className={calendarModalHeaderClass}
        />

        <ModalBody className="space-y-5">
          {submitError ? (
            <div className="rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.78))] px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {isOverdue ? (
            <div className="rounded-[1.2rem] border border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.94),rgba(255,255,255,0.78))] px-4 py-3 text-sm text-amber-800">
              Esta cita ya venció en calendario. Define el resultado o reagéndala
              para sacarla del bloque pendiente.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={cn(calendarInsetClass, "p-4")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Cliente
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-ink">
                {clientLabel || "Cliente sin nombre"}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {event.client?.serial || "Sin serie"}
              </p>

              <div className="mt-3 space-y-2">
                {event.client?.phone_number ? (
                  <ContactCopyRow
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label="Teléfono"
                    value={event.client.phone_number}
                    onCopy={() =>
                      handleCopy("Teléfono", event.client?.phone_number)
                    }
                  />
                ) : null}

                {event.client?.email ? (
                  <ContactCopyRow
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label="Email"
                    value={event.client.email}
                    onCopy={() => handleCopy("Email", event.client?.email)}
                  />
                ) : null}
              </div>
            </div>

            <div className={cn(calendarInsetClass, "p-4")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Base / campaña
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-ink">
                {event.campaign?.display_name || event.campaign?.prefix || "Sin base"}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {event.campaign?.prefix
                  ? `Prefijo ${event.campaign.prefix}`
                  : "Sin prefijo"}
              </p>
            </div>

            <div className={cn(calendarInsetClass, "p-4")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Agente
              </p>
              <p className="mt-2 inline-flex items-center gap-2 truncate text-sm font-semibold text-ink">
                <UserRound className="h-4 w-4 text-muted" />
                <span className="truncate">{event.agent?.name || "Sin agente"}</span>
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {event.agent?.email || "Sin correo"}
              </p>
            </div>

            <div className={cn(calendarInsetClass, "p-4")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Fecha pactada
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-ink">
                {formatDateTimeLabel(event.scheduled_for, eventTimeZone)}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {formatTimeZoneLabel(eventTimeZone)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className={cn(calendarInsetClass, "p-4")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/74 bg-white/68 px-3 py-1 text-xs font-semibold text-ink/80">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", currentStatus?.dotClass)}
                  />
                  {currentStatus?.label ?? "Agendada"}
                </span>
                {isOverdue ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Vencida
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <FileText className="h-3.5 w-3.5" />
                  Notas internas
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/85">
                  {event.notes?.trim() || "Sin notas internas."}
                </p>
              </div>
            </div>

            <div className={cn(calendarInsetClass, "p-4")}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                <CheckCheck className="h-3.5 w-3.5" />
                Resultado del seguimiento
              </div>

              <div className="mt-3 grid gap-2">
                {FOLLOW_UP_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isActive = actionStatus === action.value;

                  return (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setActionStatus(action.value)}
                      className={cn(
                        "rounded-[1.15rem] border px-4 py-3 text-left transition",
                        isActive
                          ? action.activeClassName
                          : "border-white/72 bg-white/62 text-ink/80 hover:border-brand/20 hover:bg-white/82",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                            isActive
                              ? "border-current/20 bg-white/70"
                              : "border-white/74 bg-white/72 text-muted",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{action.label}</p>
                          <p className="mt-1 text-xs opacity-80">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {actionStatus === "postponed" ? (
            <Field
              label="Nueva fecha y hora"
              required
              hint={`La cita se reprogramará conservando la zona ${formatTimeZoneLabel(eventTimeZone)}.`}
            >
              <CalendarDateTimeField
                dateValue={scheduledDate}
                timeValue={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
                disabled={saving}
              />
            </Field>
          ) : null}

          <Field
            label="Resultado / observación"
            hint={
              selectedActionMeta
                ? `Se guardará junto con la acción ${selectedActionMeta.label.toLowerCase()}.`
                : "Selecciona primero el resultado para cerrar la cita."
            }
          >
            <Textarea
              value={outcomeNotes}
              onChange={(textEvent) => setOutcomeNotes(textEvent.target.value)}
              placeholder="Qué pasó con la cita, qué dijo el cliente o por qué se perdió..."
              className="min-h-[140px]"
            />
          </Field>
        </ModalBody>

        <ModalFooter className={cn("justify-between", calendarModalFooterClass)}>
          <button
            type="button"
            onClick={() => onOpenEdit(event)}
            className={modalSecondaryActionClassName}
            disabled={saving}
          >
            <PencilLine className="h-4 w-4" />
            Editar cita
          </button>

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
              ) : selectedActionMeta ? (
                <selectedActionMeta.icon className="h-4 w-4" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              {actionStatus === "attended"
                ? "Marcar atendida"
                : actionStatus === "postponed"
                  ? "Posponer cita"
                  : actionStatus === "missed"
                    ? "Marcar pérdida"
                    : "Guardar seguimiento"}
            </button>
          </div>
        </ModalFooter>
      </ModalPanel>
    </div>,
    document.body,
  );
}
