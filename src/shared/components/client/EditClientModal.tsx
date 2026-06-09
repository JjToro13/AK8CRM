// EditClientModal.tsx - Modal para editar el estado del cliente y gestionar comentarios

import { useState, useEffect, useMemo } from "react";
import {
  Save,
  MessageSquare,
  AlertCircle,
  Edit2,
  Check,
  CalendarDays,
  Mail,
  Phone,
  UserPlus,
  RefreshCw,
  ArrowDownUp,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase, ClientComment, clientComments } from "../../../lib/supabase";
import { Client } from "../../../lib/supabase";
import LoadingSpinner from "../feedback/LoadingSpinner";
import {
  ClientStatusCode,
  formatDate,
  getLegacyStatusColor,
  getStatusCode,
  getStatusDotClass,
  getStatusText,
} from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";
import { useClientStatusCatalog } from "../../hooks/useClientStatusCatalog";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import {
  ModalBody,
  ModalFooter,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../layout/ModalLayout";
import {
  clientGhostButtonClass,
  clientInsetClass,
  clientModalFooterClass,
  clientModalHeaderClass,
  clientModalPanelClass,
  clientQuickActionButtonClass,
} from "./clientUi";
import {
  displayClientEmail,
  displayClientPhone,
} from "../../privacy/client-privacy";
import { useClientPrivacySettings } from "../../privacy/useClientPrivacySettings";

interface EditClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isAdmin: boolean;
  canExecuteQuickActions?: boolean;
  enableCalls?: boolean;
  callingClientId?: string | null;
  onCallClient?: (client: Client) => void;
  onOpenCallNotice?: () => void;
  onEmailClient?: (client: Client) => void;
  onScheduleClient?: (client: Client) => void;
  canAssignClient?: boolean;
  onAssignClient?: (client: Client) => void;
  hasPreviousClient?: boolean;
  hasNextClient?: boolean;
  onPrevClient?: () => void;
  onNextClient?: () => void;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const COMMENTS_PAGE_SIZE = 10;

function normalizeEmailValue(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhoneValue(value: string) {
  const digits = value.replace(/[^0-9]+/g, "");
  return digits.length > 0 ? digits : null;
}

export default function EditClientModal({
  client,
  isOpen,
  onClose,
  onSave,
  isAdmin,
  canExecuteQuickActions = false,
  enableCalls = false,
  callingClientId = null,
  onCallClient,
  onOpenCallNotice,
  onEmailClient,
  onScheduleClient,
  canAssignClient = false,
  onAssignClient,
  hasPreviousClient = false,
  hasNextClient = false,
  onPrevClient,
  onNextClient,
}: EditClientModalProps) {
  const { user } = useAuth();
  const { settings: privacySettings } = useClientPrivacySettings();
  const { statusOptions } = useClientStatusCatalog();

  const [statusCode, setStatusCode] = useState<ClientStatusCode>("NU");
  const [baselineStatusCode, setBaselineStatusCode] =
    useState<ClientStatusCode>("NU");
  const [userBalanceInput, setUserBalanceInput] = useState("");
  const [baselineUserBalance, setBaselineUserBalance] = useState<
    number | null
  >(null);
  const [clientNameInput, setClientNameInput] = useState("");
  const [clientPhoneInput, setClientPhoneInput] = useState("");
  const [clientEmailInput, setClientEmailInput] = useState("");
  const [baselineClientName, setBaselineClientName] = useState("");
  const [baselineClientPhone, setBaselineClientPhone] = useState("");
  const [baselineClientEmail, setBaselineClientEmail] = useState("");

  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsTotalCount, setCommentsTotalCount] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentsHistoryOpen, setCommentsHistoryOpen] = useState(false);
  const [commentsSortDirection, setCommentsSortDirection] = useState<
    "asc" | "desc"
  >("desc");

  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [copyFeedbackMessage, setCopyFeedbackMessage] = useState("");
  const [contentVisible, setContentVisible] = useState(true);

  useEffect(() => {
    if (!isOpen || !client?.id) return;

    setContentVisible(false);

    let frameId = 0;
    const timeoutId = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        setContentVisible(true);
      });
    }, 18);

    return () => {
      window.clearTimeout(timeoutId);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [client?.id, isOpen]);

  useEffect(() => {
    if (client && isOpen) {
      const currentCode = getStatusCode(client);
      setStatusCode(currentCode);
      setBaselineStatusCode(currentCode);
      const currentBalance =
        typeof client.user_balance === "number" ? client.user_balance : null;
      setBaselineUserBalance(currentBalance);
      setUserBalanceInput(
        currentBalance === null || Number.isNaN(currentBalance)
          ? ""
          : String(currentBalance),
      );
      const nextClientName = client.first_name || client.name || "";
      const nextClientPhone = client.phone_number || "";
      const nextClientEmail = client.email || "";
      setClientNameInput(nextClientName);
      setClientPhoneInput(nextClientPhone);
      setClientEmailInput(nextClientEmail);
      setBaselineClientName(nextClientName);
      setBaselineClientPhone(nextClientPhone);
      setBaselineClientEmail(nextClientEmail);
      setNewComment("");
      setComments([]);
      setEditingCommentId(null);
      setEditingCommentText("");
      setCommentsPage(0);
      setCommentsTotalCount(client.comment_count ?? 0);
      setHasMoreComments((client.comment_count ?? 0) > COMMENTS_PAGE_SIZE);
      setCommentsHistoryOpen(false);
      setCommentsSortDirection("desc");
      setSaveSuccessMessage("");
      setCopyFeedbackMessage("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isOpen]);

  const selectableStatusOptions = useMemo(
    () => statusOptions.filter((status) => status.code !== "NU"),
    [statusOptions],
  );

  const loadCommentsPage = async (
    page: number,
    options?: { reset?: boolean },
  ) => {
    if (!client) return;

    const reset = options?.reset ?? false;

    if (reset) {
      setLoadingComments(true);
      setComments([]);
      setCommentsPage(0);
    } else {
      setLoadingMoreComments(true);
    }

    try {
      const { data, error, count, hasMore } = await clientComments.getByClient(
        client.id,
        {
          page,
          pageSize: COMMENTS_PAGE_SIZE,
          includeCount: false,
          orderDirection: commentsSortDirection,
        },
      );

      if (error) {
        console.error("Error cargando comentarios:", error);
      } else {
        const nextRows = data || [];

        setComments((prev) => {
          if (reset) return nextRows;

          const seen = new Set(prev.map((comment) => comment.id));
          const appended = nextRows.filter((comment) => !seen.has(comment.id));
          return [...prev, ...appended];
        });
        setCommentsPage(page);
        setCommentsTotalCount((prev) => count ?? prev ?? client.comment_count ?? 0);
        setHasMoreComments(hasMore);
      }
    } catch (e) {
      console.error("Error en loadComments:", e);
    } finally {
      if (reset) {
        setLoadingComments(false);
      } else {
        setLoadingMoreComments(false);
      }
    }
  };

  const loadComments = async () => {
    await loadCommentsPage(1, { reset: true });
  };

  const loadMoreComments = async () => {
    if (!hasMoreComments || loadingMoreComments) return;
    await loadCommentsPage(commentsPage + 1, { reset: false });
  };

  const toggleCommentsHistory = async () => {
    const nextOpen = !commentsHistoryOpen;
    setCommentsHistoryOpen(nextOpen);

    if (nextOpen && commentsPage === 0) {
      await loadComments();
    }
  };

  const refreshCommentsHistory = async () => {
    if (!commentsHistoryOpen) {
      setCommentsHistoryOpen(true);
    }

    await loadComments();
  };

  const toggleCommentsSortDirection = async () => {
    const nextDirection = commentsSortDirection === "desc" ? "asc" : "desc";
    setCommentsSortDirection(nextDirection);

    if (commentsHistoryOpen) {
      await loadCommentsPage(1, { reset: true });
    }
  };

  const copyFieldValue = async (label: string, value?: string | null) => {
    const nextValue = (value ?? "").trim();
    if (!nextValue) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextValue);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = nextValue;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopyFeedbackMessage(`${label} copiado.`);
      window.setTimeout(() => {
        setCopyFeedbackMessage("");
      }, 2200);
    } catch {
      setError(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  };

  const startEditComment = (comment: ClientComment) => {
    setCommentError(null);
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  function getFriendlyCommentError(error: any): string {
    if (!error) return "No se pudo actualizar el comentario.";

    const msg = error.message || "";

    if (msg.includes("single JSON object")) {
      return "No tienes permiso para editar este comentario.";
    }

    if (msg.includes("row-level security")) {
      return "No tienes permisos para modificar este comentario.";
    }

    if (msg.includes("network")) {
      return "Error de conexión. Intenta nuevamente.";
    }

    return "No se pudo actualizar el comentario. Intenta nuevamente.";
  }

  const saveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      setCommentError("El comentario no puede estar vacío");
      return;
    }

    try {
      setCommentError(null);

      const { error } = await clientComments.update(
        commentId,
        editingCommentText,
      );

      if (error) {
        console.error("Supabase error:", error);
        setCommentError(getFriendlyCommentError(error));
        return;
      }

      await loadComments();
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (e) {
      console.error("Error guardando edición:", e);
      setCommentError("Error inesperado al guardar");
    }
  };

  const parseUserBalanceInput = () => {
    const trimmed = userBalanceInput.trim();

    if (!trimmed) return { value: null as number | null, isValid: true };

    if (!/^-?\d+([.,]\d+)?$/.test(trimmed)) {
      return { value: null as number | null, isValid: false };
    }

    const parsed = Number(trimmed.replace(",", "."));
    if (Number.isNaN(parsed)) {
      return { value: null as number | null, isValid: false };
    }

    return { value: parsed, isValid: true };
  };

  const validateContactInputs = () => {
    const email = clientEmailInput.trim();
    const phone = clientPhoneInput.trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "El email debe tener un formato valido.";
    }

    if (phone.length > 20) {
      return "El telefono no puede superar 20 caracteres.";
    }

    return null;
  };

  const handleSave = async () => {
    if (!client || !user) return;

    setLoading(true);
    setError("");
    setSaveSuccessMessage("");

    try {
      const currentStatus = baselineStatusCode;
      const statusChanged = statusCode !== currentStatus;
      const hasNewComment = !!newComment.trim();
      const { value: parsedUserBalance, isValid: isUserBalanceValid } =
        parseUserBalanceInput();
      const balanceChanged = isAdmin && parsedUserBalance !== baselineUserBalance;
      const trimmedClientName = clientNameInput.trim();
      const trimmedClientPhone = clientPhoneInput.trim();
      const trimmedClientEmail = clientEmailInput.trim();
      const contactChanged =
        isAdmin &&
        (trimmedClientName !== baselineClientName ||
          trimmedClientPhone !== baselineClientPhone ||
          trimmedClientEmail !== baselineClientEmail);

      if (isAdmin && !isUserBalanceValid) {
        setError("El valor depositado debe ser un numero valido.");
        return;
      }

      if (isAdmin && contactChanged) {
        const contactError = validateContactInputs();
        if (contactError) {
          setError(contactError);
          return;
        }
      }

      if (!statusChanged && !hasNewComment && !balanceChanged && !contactChanged) {
        onClose();
        return;
      }

      if (statusCode === "NU" && currentStatus !== "NU") {
        setError("La tipificacion Nuevo es automatica y no puede asignarse manualmente.");
        return;
      }

      if (statusChanged || balanceChanged || contactChanged) {
        const nextUpdate: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (statusChanged) {
          nextUpdate.status_code = statusCode;
          nextUpdate.status_color = getLegacyStatusColor(statusCode);
        }

        if (balanceChanged) {
          nextUpdate.user_balance = parsedUserBalance;
        }

        if (contactChanged) {
          nextUpdate.first_name = trimmedClientName || null;
          nextUpdate.email = trimmedClientEmail || null;
          nextUpdate.phone_number = trimmedClientPhone || null;
          nextUpdate.normalized_email = normalizeEmailValue(trimmedClientEmail);
          nextUpdate.normalized_phone = normalizePhoneValue(trimmedClientPhone);
        }

        let updateRequest = supabase
          .from("clients")
          .update(nextUpdate)
          .eq("id", client.id);

        if (client.operation_id) {
          updateRequest = updateRequest.eq("operation_id", client.operation_id);
        }

        const { error: updateError } = await updateRequest;

        if (updateError) {
          const duplicateContact =
            updateError.message?.includes("normalized_email") ||
            updateError.message?.includes("normalized_phone") ||
            updateError.message?.includes("duplicate key");
          setError(
            duplicateContact
              ? "Ya existe otro cliente con ese email o telefono en esta operacion."
              : updateError.message,
          );
          return;
        }
      }

      if (hasNewComment) {
        const { error: commentInsertError } = await clientComments.add(
          client.id,
          user.id,
          newComment,
        );

        if (commentInsertError) {
          console.error("Error añadiendo comentario:", commentInsertError);
          setError(
            statusChanged
              ? "Cliente actualizado, pero hubo un error al guardar el comentario"
              : "No se pudo guardar el comentario",
          );
          return;
        }
      }

      if (statusChanged) {
        setBaselineStatusCode(statusCode);
      }

      if (balanceChanged) {
        setBaselineUserBalance(parsedUserBalance);
        setUserBalanceInput(
          parsedUserBalance === null ? "" : String(parsedUserBalance),
        );
      }

      if (contactChanged) {
        setBaselineClientName(trimmedClientName);
        setBaselineClientPhone(trimmedClientPhone);
        setBaselineClientEmail(trimmedClientEmail);
        setClientNameInput(trimmedClientName);
        setClientPhoneInput(trimmedClientPhone);
        setClientEmailInput(trimmedClientEmail);
      }

      if (hasNewComment) {
        setNewComment("");
        setCommentsHistoryOpen(true);
        await loadCommentsPage(1, { reset: true });
        setCommentsTotalCount((prev) => prev + 1);
      }

      await Promise.resolve(onSave());
      setSaveSuccessMessage(
        hasNewComment
          ? statusChanged
            ? "Cliente actualizado y comentario guardado. La ventana permanece abierta."
            : "Comentario guardado. La ventana permanece abierta."
          : statusChanged || balanceChanged
            ? "Cliente actualizado correctamente."
            : contactChanged
            ? "Cliente actualizado correctamente."
            : "Cambios guardados correctamente.",
      );
    } catch (e) {
      console.error(e);
      setError("Error inesperado al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !client) return null;

  const currentResolvedText = getStatusText(baselineStatusCode);
  const selectedResolvedText = getStatusText(statusCode);
  const currentStatusCode = baselineStatusCode;
  const currentStatusIsSC = currentStatusCode === "NU";
  const statusChanged = statusCode !== currentStatusCode;
  const canCall =
    canExecuteQuickActions && !(enableCalls && callingClientId === client.id);
  const canEmail = canExecuteQuickActions && Boolean(client.email);
  const canSchedule = canExecuteQuickActions;
  const phoneInputMasked = privacySettings.maskPhoneNumbers && clientPhoneInput.trim();
  const emailInputMasked = privacySettings.maskEmails && clientEmailInput.trim();
  const visiblePhoneInput = phoneInputMasked
    ? displayClientPhone(clientPhoneInput, privacySettings)
    : clientPhoneInput;
  const visibleEmailInput = emailInputMasked
    ? displayClientEmail(clientEmailInput, privacySettings)
    : clientEmailInput;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_42%),rgba(15,23,42,0.5)] backdrop-blur-[4px]"
        onClick={handleBackdropClick}
        aria-label="Cerrar modal de cliente"
      />
      <ModalPanel className={cn(clientModalPanelClass, "max-h-[90vh] max-w-5xl")}>
        <div
          className={cn(
            clientModalHeaderClass,
            "flex items-center justify-between gap-4 border-b border-border bg-surface2 px-6 py-5",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10">
              <MessageSquare className="h-5 w-5 text-brand" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-ink sm:text-lg">
                Editar cliente
              </h2>
              <p className="truncate text-xs text-muted">
                {`${clientNameInput || client.first_name || client.name || "Cliente"} - ${client.serial}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrevClient || onNextClient ? (
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/68 px-2 py-1 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={onPrevClient}
                  disabled={loading || !hasPreviousClient}
                  className={cn(
                    modalSecondaryActionClassName,
                    "min-w-[5.5rem] justify-center border-0 bg-transparent px-3 py-1.5 text-sm shadow-none",
                  )}
                >
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  Atras
                </button>

                <button
                  type="button"
                  onClick={onNextClient}
                  disabled={loading || !hasNextClient}
                  className={cn(
                    modalSecondaryActionClassName,
                    "min-w-[6.2rem] justify-center border-0 bg-transparent px-3 py-1.5 text-sm shadow-none",
                  )}
                >
                  Siguiente
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-ink disabled:opacity-50"
              aria-label="Cerrar"
              title="Cerrar"
              disabled={loading}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <ModalBody className="crm-scrollbar crm-scrollbar-shell max-h-[calc(90vh-86px-78px)] overflow-y-auto">
          <div
            className={cn(
              "space-y-6 transition-all duration-200 ease-out",
              contentVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0",
            )}
          >
          {/* Info básica */}
          {saveSuccessMessage ? (
            <div className="rounded-3xl border border-emerald-200/90 bg-[linear-gradient(180deg,rgba(220,252,231,0.86),rgba(255,255,255,0.72))] p-4">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">
                  {saveSuccessMessage}
                </p>
              </div>
            </div>
          ) : null}

          {copyFeedbackMessage ? (
            <div className="rounded-3xl border border-sky-200/90 bg-[linear-gradient(180deg,rgba(224,242,254,0.86),rgba(255,255,255,0.72))] p-4">
              <div className="flex items-start gap-2">
                <Copy className="mt-0.5 h-4.5 w-4.5 text-sky-600" />
                <p className="text-sm font-semibold text-sky-800">
                  {copyFeedbackMessage}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="block text-xs font-semibold text-muted mb-2">
                Nombre
              </div>
              <Input
                type="text"
                value={clientNameInput}
                onChange={(event) => {
                  setSaveSuccessMessage("");
                  setClientNameInput(event.target.value);
                }}
                disabled={!isAdmin || loading}
                className="border-white/70 bg-white/72 backdrop-blur-xl"
              />
            </div>

            <div>
              <div className="block text-xs font-semibold text-muted mb-2">
                Serie
              </div>
              <Input
                type="text"
                value={client.serial}
                disabled
                className="border-white/70 bg-white/72 backdrop-blur-xl"
              />
            </div>

            <div>
              <div className="block text-xs font-semibold text-muted mb-2">
                Telefono
              </div>
              <Input
                type="text"
                value={visiblePhoneInput}
                onChange={(event) => {
                  setSaveSuccessMessage("");
                  setClientPhoneInput(event.target.value);
                }}
                disabled={!isAdmin || loading || Boolean(phoneInputMasked)}
                className="border-white/70 bg-white/72 backdrop-blur-xl"
                rightSlot={
                  clientPhoneInput.trim() && !phoneInputMasked ? (
                    <button
                      type="button"
                      onClick={() =>
                        void copyFieldValue("Telefono", clientPhoneInput)
                      }
                      disabled={loading}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/88 text-muted shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition hover:border-brand/18 hover:text-ink"
                      title="Copiar telefono"
                      aria-label="Copiar telefono"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  ) : null
                }
              />
            </div>

            <div>
              <div className="block text-xs font-semibold text-muted mb-2">
                Email
              </div>
              <Input
                type="text"
                value={visibleEmailInput}
                onChange={(event) => {
                  setSaveSuccessMessage("");
                  setClientEmailInput(event.target.value);
                }}
                disabled={!isAdmin || loading || Boolean(emailInputMasked)}
                className="border-white/70 bg-white/72 backdrop-blur-xl"
                rightSlot={
                  clientEmailInput.trim() && !emailInputMasked ? (
                    <button
                      type="button"
                      onClick={() => void copyFieldValue("Email", clientEmailInput)}
                      disabled={loading}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/88 text-muted shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition hover:border-brand/18 hover:text-ink"
                      title="Copiar email"
                      aria-label="Copiar email"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  ) : null
                }
              />
            </div>

            {isAdmin ? (
              <div className="md:col-span-2 xl:col-span-4 -mt-2 text-xs text-muted">
                Nombre, telefono y email son editables solo para administrador.
                El sistema mantiene validacion de duplicados por operacion.
                {phoneInputMasked || emailInputMasked
                  ? " La privacidad del tenant esta ofuscando campos de contacto."
                  : ""}
              </div>
            ) : null}

            {isAdmin ? (
              <div className="md:col-span-2 xl:col-span-4">
                <div className="block text-xs font-semibold text-muted mb-2">
                  Valor depositado
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={userBalanceInput}
                  onChange={(event) => {
                    setSaveSuccessMessage("");
                    setUserBalanceInput(event.target.value);
                  }}
                  placeholder="Ej. 1500 o 1500.50"
                  className="border-white/70 bg-white/72 backdrop-blur-xl"
                />
                <p className="mt-2 text-xs text-muted">
                  Campo editable solo para administrador. Se guarda en
                  <span className="font-semibold text-ink/80"> user_balance</span>.
                </p>
              </div>
            ) : null}
          </div>

          {/* Estado */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="block text-xs font-semibold text-muted">
                Tipificación del Cliente
              </div>

              <div className={cn(clientInsetClass, "px-3 py-2 text-xs text-muted")}>
                <div>
                  Actual:{" "}
                  <span className="inline-flex items-center gap-2 font-semibold text-ink/80">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        getStatusDotClass(currentStatusCode),
                      )}
                    />
                    {currentResolvedText}
                  </span>
                </div>
                <div className="mt-0.5">
                  Seleccionada:{" "}
                  <span className="inline-flex items-center gap-2 font-semibold text-ink/80">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        getStatusDotClass(statusCode),
                      )}
                    />
                    {selectedResolvedText}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.82),rgba(255,255,255,0.68))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <p className="text-[11px] leading-relaxed text-amber-800">
                <span className="font-semibold">Nuevo</span> es automatico y no
                se puede asignar manualmente. Puedes guardar solo un comentario
                sin cambiar el estado.
              </p>
            </div>

            <div
              className={cn(
                clientInsetClass,
                "grid gap-4 p-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]",
              )}
            >
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  Estado nuevo
                </div>

                <Select
                  value={statusCode === "NU" ? undefined : statusCode}
                  onValueChange={(value) => {
                    setSaveSuccessMessage("");
                    setStatusCode(value as ClientStatusCode);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableStatusOptions.map((status) => (
                      <SelectItem key={status.code} value={status.code}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              getStatusDotClass(status.code),
                            )}
                          />
                          <span>
                            {status.shortLabel} · {status.label}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-white/74 bg-white/72 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full shrink-0",
                      getStatusDotClass(statusCode),
                    )}
                  />
                  <span className="text-sm font-semibold text-ink/85">
                    {selectedResolvedText}
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    {statusCode}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {selectableStatusOptions.find(
                    (status) => status.code === statusCode,
                  )?.description ??
                    "Selecciona el estado que mejor represente la gestion actual."}
                </p>
              </div>
            </div>

            {currentStatusIsSC && !statusChanged && (
              <p className="text-[11px] text-muted">
                El cliente sigue en <span className="font-semibold">Nuevo</span>.
                No necesitas cambiar la tipificacion para agregar un comentario.
              </p>
            )}

          </div>

          {/* Historial */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="block text-xs font-semibold text-muted">
                Historial de Comentarios
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                  {commentsTotalCount > 0
                    ? commentsTotalCount
                    : hasMoreComments
                      ? `${comments.length}+`
                      : comments.length}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleCommentsHistory()}
                  className={cn(clientGhostButtonClass, "gap-2 px-3 py-1.5 text-xs")}
                >
                  {commentsHistoryOpen ? "Ocultar historial" : "Ver historial"}
                </button>
                <button
                  type="button"
                  onClick={() => void refreshCommentsHistory()}
                  className={cn(clientGhostButtonClass, "gap-2 px-3 py-1.5 text-xs")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => void toggleCommentsSortDirection()}
                  className={cn(clientGhostButtonClass, "gap-2 px-3 py-1.5 text-xs")}
                >
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  {commentsSortDirection === "desc"
                    ? "Mas recientes"
                    : "Mas antiguos"}
                </button>
              </div>
            </div>

            <div className={cn(clientInsetClass, "rounded-3xl p-4")}>
              {!commentsHistoryOpen ? (
                <div className="py-3 text-sm text-muted">
                  El historial no se carga automaticamente. Abre el historial solo
                  cuando lo necesites.
                </div>
              ) : loadingComments ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner
                    size="sm"
                    text="Cargando comentarios..."
                    fullScreen={false}
                  />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-muted py-3">
                  Sin comentarios aún.
                </div>
              ) : (
                <div className="crm-scrollbar crm-scrollbar-shell max-h-72 overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      const canEdit = user && comment.agent_id === user.id;
                      const isEditing = editingCommentId === comment.id;

                      return (
                        <div
                          key={comment.id}
                          className="rounded-2xl border border-white/76 bg-white/72 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => {
                                  setEditingCommentText(e.target.value);
                                  if (commentError) setCommentError(null);
                                }}
                                className="h-24 resize-none"
                                rows={3}
                              />
                              {commentError && (
                                <span className="mt-3 flex items-start gap-2 rounded-xl border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,226,226,0.82),rgba(255,255,255,0.7))] px-3 py-2">
                                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                  <p className="text-xs font-medium leading-relaxed text-red-700">
                                    {commentError}
                                  </p>
                                </span>
                              )}

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditComment}
                                  className={cn(clientGhostButtonClass, "px-3 py-1.5 text-xs")}
                                >
                                  Cancelar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => saveEditComment(comment.id)}
                                  className="inline-flex items-center rounded-full bg-gradient-to-r from-brand via-brand-600 to-brand-700 px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:brightness-105 active:brightness-95"
                                >
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                                {comment.comment}
                              </p>

                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
                                  <span className="max-w-[220px] truncate font-semibold text-brand">
                                    {comment.agent?.name || "Desconocido"}
                                  </span>
                                  <span className="text-border">•</span>
                                  <span className="whitespace-nowrap">
                                    {formatDate(comment.created_at)}
                                  </span>
                                </div>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => startEditComment(comment)}
                                    className={cn(clientGhostButtonClass, "gap-1 px-3 py-1.5 text-xs")}
                                    title="Editar comentario"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Editar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {hasMoreComments ? (
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={loadMoreComments}
                          disabled={loadingMoreComments}
                          className={cn(clientGhostButtonClass, "gap-2 px-4 py-2 text-sm")}
                        >
                          {loadingMoreComments ? (
                            "Cargando..."
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Cargar más
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nuevo comentario */}
          <div>
            <div className="block text-xs font-semibold text-muted mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Añadir Nuevo Comentario
            </div>

            <Textarea
              value={newComment}
              onChange={(e) => {
                setSaveSuccessMessage("");
                setNewComment(e.target.value);
              }}
              placeholder="Escribe un nuevo comentario sobre este cliente..."
              className="h-32 resize-none"
              rows={4}
            />

            <p className="text-xs text-muted mt-2">
              {newComment.trim()
                ? "Este comentario se añadirá al historial"
                : "El comentario es opcional"}
            </p>
          </div>

          {/* Info adicional */}
          <div className="rounded-3xl border border-brand/12 bg-[linear-gradient(180deg,rgb(var(--color-surface-elevated)/0.88),rgb(var(--color-surface)/0.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <h3 className="mb-2 text-xs font-semibold text-ink/82">
              Información Adicional
            </h3>

            <div className="text-sm text-muted">
              <p>
                <span className="font-semibold text-ink/86">
                  Intentos de llamada:
                </span>{" "}
                {client.attempts}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Última actualización:</span>{" "}
                {formatDate(client.updated_at || client.created_at)}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-3xl border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,226,226,0.82),rgba(255,255,255,0.7))] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            </div>
          )}
          </div>

        </ModalBody>

        {/* Footer */}
        <ModalFooter className={clientModalFooterClass}>
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="hidden text-[11px] font-semibold uppercase tracking-[0.24em] text-muted xl:block">
                Acciones rapidas
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!canExecuteQuickActions) return;
                  if (enableCalls) onCallClient?.(client);
                  else onOpenCallNotice?.();
                }}
                disabled={!canCall}
                className={clientQuickActionButtonClass("call", canCall)}
              >
                <Phone className="h-4 w-4" />
                Llamar
              </button>

              <button
                type="button"
                onClick={() => onEmailClient?.(client)}
                disabled={!canEmail}
                className={clientQuickActionButtonClass("email", canEmail)}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>

              <button
                type="button"
                onClick={() => onScheduleClient?.(client)}
                disabled={!canSchedule}
                className={clientQuickActionButtonClass("calendar", canSchedule)}
              >
                <CalendarDays className="h-4 w-4" />
                Calendario
              </button>

              {canAssignClient ? (
                <button
                  type="button"
                  onClick={() => onAssignClient?.(client)}
                  className={clientQuickActionButtonClass("neutral", true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Asignacion
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={modalSecondaryActionClassName}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className={modalPrimaryActionClassName}
              >
                {loading ? (
                  <LoadingSpinner
                    size="sm"
                    text="Guardando..."
                    fullScreen={false}
                  />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalFooter>
      </ModalPanel>
    </div>
  );
}
